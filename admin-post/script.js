document.addEventListener("DOMContentLoaded", function () {
    const fileInput = document.getElementById('fileInput');
    const imgBox = document.getElementById('imgBox');
    const deleteModal = document.getElementById('deleteModal');
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const customAlertModal = document.getElementById('customAlertModal');
    const customAlertMessage = document.getElementById('customAlertMessage');
    let imageToDelete = null;
    let adminPassword = null;

    // Show login modal
    window.showLoginModal = function () {
        loginModal.style.display = 'block';
    };

    // Close login modal
    window.closeLoginModal = function () {
        loginModal.style.display = 'none';
    };

    // Show custom alert
    window.showCustomAlert = function (message) {
        customAlertMessage.textContent = message;
        customAlertModal.style.display = 'block';
    };

    // Close custom alert
    window.closeCustomAlert = function () {
        customAlertModal.style.display = 'none';
    };

    // Handle login form submission
    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const passwordInput = document.getElementById('passwordInput').value;

        fetch('http://localhost:3000/verify-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: passwordInput })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Login successful') {
                adminPassword = passwordInput;
                closeLoginModal();
                showCustomAlert('Login successful!');
            } else {
                showCustomAlert('Incorrect admin password.');
            }
        });
    });

    // Trigger file input click
    window.triggerFileInput = function () {
        if (!adminPassword) {
            showCustomAlert('You must be logged in as admin to upload images.');
            showLoginModal();
            return;
        }
        fileInput.click();
    };

    // Load images from server
    function loadImages() {
        fetch('http://localhost:3000/images')
            .then(response => response.json())
            .then(images => {
                imgBox.innerHTML = ''; // Clear existing images
                images.forEach(filename => {
                    const imgElement = document.createElement('div');
                    imgElement.classList.add('image');
                    imgElement.innerHTML = `
                        <img src="http://localhost:3000/uploads/${filename}" alt="Uploaded Image">
                        <button class="delete-btn" onclick="showDeleteModal(this, '${filename}')">Delete</button>
                    `;
                    imgBox.appendChild(imgElement);
                });
            })
            .catch(error => console.error('Error fetching images:', error));
    }

    loadImages(); // Load images on page load

    // Upload image to server
    window.loadFile = function (event) {
        const file = event.target.files[0]; // Get the selected file
        if (file && adminPassword) {
            const formData = new FormData();
            formData.append('image', file); // Append the file to the form data

            fetch('http://localhost:3000/upload', {
                method: 'POST',
                headers: {
                    'admin-password': adminPassword
                },
                body: formData // Send the form data
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Image upload failed.');
                }
                return response.json();
            })
            .then(data => {
                loadImages(); // Reload images to display the newly uploaded image
            })
            .catch(error => {
                showCustomAlert('Image upload failed.');
                console.error('Error uploading image:', error);
            });
        } else {
            showCustomAlert('You must be logged in as admin to upload images.');
        }
    };

    // Show delete confirmation modal
    window.showDeleteModal = function (btn, filename) {
        if (!adminPassword) {
            showCustomAlert('You must be logged in as admin to delete images.');
            showLoginModal();
            return;
        }
        deleteModal.style.display = 'block';
        imageToDelete = { btn, filename }; // Store the reference to the button and filename
    };

    // Close delete modal
    window.closeModal = function () {
        deleteModal.style.display = 'none';
        imageToDelete = null;
    };

    // Confirm delete
    window.confirmDelete = function () {
        const filename = imageToDelete.filename; // Get the filename
        fetch(`http://localhost:3000/delete/${filename}`, {
            method: 'DELETE',
            headers: {
                'admin-password': adminPassword,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            deleteModal.style.display = 'none';
            loadImages(); // Reload images after deletion
        });
        
    };
});
