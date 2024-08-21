document.addEventListener('DOMContentLoaded', () => {
    const socket = io.connect();

    let roomId = null;
    let fileToSend = null;
    let startTime;
    let lastUploadedBytes = 0;

    const fileInput = document.getElementById('file-input');
    const sendBtn = document.getElementById('send-btn');
    const uploadProgress = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const uploadSpeedText = document.getElementById('upload-speed');

    // When the socket connects
    socket.on('connect', () => {
        roomId = new URLSearchParams(window.location.search).get('roomId');
        socket.emit('joinRoom', { roomId: roomId });

        // Show connection progress
        document.getElementById('connection-progress').classList.remove('hidden');
        const connectionBar = document.getElementById('connection-progress-bar');
        connectionBar.style.width = '50%';

        setTimeout(() => {
            connectionBar.style.width = '100%';
            document.getElementById('connection-status-text').textContent = 'Connected!';
            setTimeout(() => {
                document.getElementById('connection-progress').classList.add('hidden');
            }, 1000);
        }, 2000);
    });

    // When a room is joined
    socket.on('roomJoined', (data) => {
        document.getElementById('status').textContent = `Connected as ${data.userName}`;
        roomId = data.roomId;

        const roomLink = `${window.location.origin}?roomId=${roomId}`;
        document.getElementById('room-link-url').textContent = roomLink;
        document.getElementById('room-link-url').href = roomLink;

        // Show QR code
        const qrCodeContainer = document.getElementById('qr-code');
        qrCodeContainer.innerHTML = '';
        new QRCode(qrCodeContainer, {
            text: roomLink,
            width: 128,
            height: 128,
        });

        document.getElementById('room-info').classList.remove('hidden');
        document.getElementById('connected-users').classList.remove('hidden');
        document.getElementById('loading-spinner').classList.add('hidden');
    });

    // Update connected users
    socket.on('userJoined', (data) => {
        updateConnectedUsers(data.connectedUsers);
    });

    socket.on('userLeft', (data) => {
        updateConnectedUsers(data.connectedUsers);
    });

    // Handle received files
    socket.on('receiveFile', (data) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([new Uint8Array(data.fileBuffer)]));
        link.download = data.fileName;
        link.textContent = `${data.userName} sent: ${data.fileName}`;
        link.classList.add('file-item');
        document.getElementById('received-files').appendChild(link);
    });

    // Handle file input change
    fileInput.addEventListener('change', (event) => {
        fileToSend = event.target.files[0];
    });

    // Handle file upload button click
    sendBtn.addEventListener('click', () => {
        if (fileToSend) {
            handleFileUpload(fileToSend);
        } else {
            alert('No file selected!');
        }
    });

    // Function to handle file upload with progress
    const handleFileUpload = (file) => {
        const reader = new FileReader();

        reader.onloadstart = () => {
            startTime = Date.now();
            uploadProgress.classList.remove('hidden');
            lastUploadedBytes = 0; // Reset the last uploaded bytes to zero
        };

        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = (event.loaded / event.total) * 100;
                progressBar.style.width = `${percent}%`;
                const totalMB = (event.total / 1024 / 1024).toFixed(2);
                const loadedMB = (event.loaded / 1024 / 1024).toFixed(2);
                progressText.textContent = `${loadedMB} MB of ${totalMB} MB (${Math.round(percent)}%)`;

                const elapsedTime = (Date.now() - startTime) / 1000;
                const bytesPerSecond = (event.loaded - lastUploadedBytes) / elapsedTime;
                lastUploadedBytes = event.loaded;
                const speedMBps = (bytesPerSecond / 1024 / 1024).toFixed(2);
                uploadSpeedText.textContent = `Speed: ${speedMBps} MB/s`;
            }
        };

        reader.onloadend = () => {
            uploadProgress.classList.add('hidden');
        };

        reader.onload = () => {
            socket.emit('sendFile', {
                fileName: file.name,
                fileBuffer: Array.from(new Uint8Array(reader.result))
            });
            fileToSend = null;
            fileInput.value = '';
        };

        reader.readAsArrayBuffer(file);
    };

    // Handle show/hide of room details
    document.getElementById('reveal-btn').addEventListener('click', () => {
        document.getElementById('share-info').classList.toggle('hidden');
    });

    // Handle received files toggle button
    document.getElementById('toggle-files-btn').addEventListener('click', () => {
        const receivedFiles = document.getElementById('received-files');
        const button = document.getElementById('toggle-files-btn');

        if (receivedFiles.classList.contains('hidden')) {
            receivedFiles.classList.remove('hidden');
            button.textContent = 'Hide Received Files';
        } else {
            receivedFiles.classList.add('hidden');
            button.textContent = 'Show Received Files';
        }
    });

    // Handle close button in received files
    document.getElementById('close-files-btn').addEventListener('click', () => {
        document.getElementById('received-files').classList.add('hidden');
        document.getElementById('toggle-files-btn').textContent = 'Show Received Files';
    });

    // Function to update connected users list
    function updateConnectedUsers(users) {
        const userList = document.getElementById('user-list');
        userList.innerHTML = '';

        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user.userName;
            userList.appendChild(li);
        });
    }
});
