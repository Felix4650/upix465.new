const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const ADMIN_PASSWORD = 'felo1'; // Replace with a strong password

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'admin-post', 'public')));
// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


// Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, 'admin-post', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Save images directly in admin-post/public/uploads/
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: File type not supported!'));
    }
});

// Middleware to check admin password
const verifyAdminPassword = (req, res, next) => {
    const adminPassword = req.headers['admin-password'];
    if (adminPassword !== ADMIN_PASSWORD) {
        return res.status(403).send('Permission denied: Incorrect admin password.');
    }
    next();
};

// Endpoint to verify admin password
app.post('/verify-password', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.status(200).send({ message: 'Login successful' });
    } else {
        res.status(403).send({ message: 'Incorrect admin password' });
    }
});

// Endpoint to upload images
app.post('/upload', verifyAdminPassword, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const imagesFilePath = path.join(__dirname, 'admin-post', 'images.json');
    let images = [];

    if (fs.existsSync(imagesFilePath)) {
        images = JSON.parse(fs.readFileSync(imagesFilePath, 'utf8'));
    }

    images.push(req.file.filename);
    fs.writeFileSync(imagesFilePath, JSON.stringify(images));

    console.log('Image uploaded successfully:', req.file.filename);
    res.status(200).send({ filename: req.file.filename });
});

// Endpoint to delete images
app.delete('/delete/:filename', verifyAdminPassword, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    const imagesFilePath = path.join(__dirname, 'admin-post', 'images.json');
    
    // Check if images.json exists and read the image list
    if (!fs.existsSync(imagesFilePath)) {
        return res.status(500).send('Image database file not found.');
    }

    let images = JSON.parse(fs.readFileSync(imagesFilePath, 'utf8'));
    
    // Check if the image is in the list
    const index = images.indexOf(filename);
    if (index === -1) {
        return res.status(404).send('Image not found in database.');
    }

    // Remove image from the list
    images.splice(index, 1);
    fs.writeFileSync(imagesFilePath, JSON.stringify(images));

    // Check if the file exists before deleting
if (fs.existsSync(filePath)) {
    console.log(`File found: ${filePath}, attempting to delete.`);
    
    fs.unlink(filePath, (err) => {
        if (err) {
            console.warn('Could not delete file, but continuing:', err.message);
        } else {
            console.log('File deleted successfully:', filePath);
        }
        res.status(200).send('Image deleted.');
    });
} else {
    console.error('File not found, cannot delete:', filePath);
    res.status(404).send('Image file not found.');
}

});


// Endpoint to get images
app.get('/images', (req, res) => {
    const imagesFilePath = path.join(__dirname, 'admin-post', 'images.json');
    let images = fs.existsSync(imagesFilePath) ? JSON.parse(fs.readFileSync(imagesFilePath, 'utf8')) : [];
    res.status(200).json(images);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'loading.html'));
});

//static files fullmoton
// Serve static files from the 'fullmotion/assets/css' directory
app.use('/fullmotion', express.static(path.join(__dirname, 'fullmotion')));

// Serve Admin Application
app.use('/admin', express.static(path.join(__dirname, 'admin-post')));

// Serve Chat Application
app.use('/chat', express.static(path.join(__dirname, 'chatmsgs-pro', 'public')));
app.use('/chat', express.static(path.join(__dirname, 'chatmsgs-pro')));
// Socket.io for chat application
let messages = [];

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('login', (username) => {
        socket.username = username;
        socket.emit('loadMessages', messages);
    });

    socket.on('sendMessage', (data) => {
        messages.push(data);
        io.emit('receiveMessage', data);
    });

    socket.on('loadMessages', () => {
        socket.emit('loadMessages', messages);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
