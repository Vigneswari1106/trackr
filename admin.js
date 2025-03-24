const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = 3020;

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/trackingid', { 
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    trackingId: { type: String, required: true, unique: true },
    hub: { type: String, required: true },
    statusUpdates: { type: [{ status: String, timestamp: String }], default: [] }
});

const User = mongoose.model('User', userSchema);

// Admin Credentials
const adminCredentials = {
    "che_admin@courier.com": "che12345", // Chennai
    "coi_admin@courier.com": "coi12345", // Coimbatore
    "tri_admin@courier.com": "tri12345", // Trichy
    "mad_admin@courier.com": "mad12345", // Madurai
    "sal_admin@courier.com": "sal12345", // Salem
    "tir_admin@courier.com": "tir12345", // Tiruppur
    "ero_admin@courier.com": "ero12345", // Erode
};

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// Route for login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

// Admin login route
app.post('/admin-login', (req, res) => {
    const { email, password } = req.body;

    if (adminCredentials[email] && adminCredentials[email] === password) {
        const hub = email.split('_')[0].toUpperCase();
        return res.redirect(`/hub/${hub.toLowerCase()}`);
    }

    res.status(401).send('<h3 style="color: red;">Invalid email or password</h3>');
});

// Route to display hub-specific tracking IDs
app.get('/hub/:hub', async (req, res) => {
    const hubCode = req.params.hub.toUpperCase();
    const hubMap = {
        CHENNAI: 'Chennai',
        COI: 'Coimbatore',
        TRI: 'Trichy',
        MAD: 'Madurai',
        SAL: 'Salem',
        TIR: 'Tiruppur',
        ERO: 'Erode',
    };

    const hubName = hubMap[hubCode];

    if (!hubName) {
        return res.status(404).send('<h3>Invalid hub code</h3>');
    }
   
    try {
        // Fetch tracking IDs for the logged-in hub
        const users = await User.find({ hub: hubName });
        console.log("🔍 Fetched Users for", hubName, ":", users);
        
        if (!users.length) {
            return res.send(`<h1>No tracking IDs found for ${hubName} hub</h1>`);
        }

        // Generate table rows
        const trackingRows = users.map((user) => `
            <tr>
                <td>${user.trackingId}</td>
                <td>${user.statusUpdates.map(update => `<p>${update.status} - ${update.timestamp}</p>`).join('')}</td>
            </tr>
        `).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${hubName} Hub - Tracking</title>
                <style>
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #f2f2f2;
                    }
                    button {
                        padding: 10px;
                        background-color: green;
                        color: white;
                        border: none;
                        cursor: pointer;
                        font-size: 16px;
                        margin-top: 20px;
                    }
                    button:hover {
                        background-color: darkgreen;
                    }
                </style>
                <script>
                    function updateStatuses() {
                        fetch('/update-all-statuses', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ hubName: "${hubName}", newStatus: "Your courier reached at ${hubName}" })
                        })
                        .then(response => response.json())
                        .then(data => {
                            alert("Status updated successfully!");
                            location.reload();
                        })
                        .catch(error => console.error("Error updating status:", error));
                    }
                </script>
            </head>
            <body>
                <h1>Tracking IDs for ${hubName} Hub</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Tracking ID</th>
                            <th>Status Updates</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${trackingRows}
                    </tbody>
                </table>
                <button onclick="updateStatuses()">Update All Statuses</button>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('❌ Error fetching tracking details:', err);
        res.status(500).send('<h3>Error fetching tracking details</h3>');
    }
});

// Route to update all tracking statuses for a hub
app.put('/update-all-statuses', async (req, res) => {
    try {
        console.log('--- Received PUT request to update all tracking IDs ---');
        console.log('Request body:', req.body);

        const { hubName, newStatus } = req.body;
        if (!hubName || !newStatus) {
            return res.status(400).json({ message: 'Hub name and status are required' });
        }

        // ✅ Convert timestamp to IST (Only Date & Time)
        const now = new Date();
        const ISTTime = now.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: "Asia/Kolkata" });
        const ISTDate = now.toLocaleDateString("en-IN", { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: "Asia/Kolkata" });

        const currentTime = `${ISTDate} ${ISTTime}`; // Format: "DD/MM/YYYY HH:MM:SS"

        const statusUpdate = { status: `Your courier reached at ${hubName} Hub`, timestamp: currentTime };

        // ✅ Update all users in the hub
        const updatedUsers = await User.updateMany(
            { hub: hubName },
            { $push: { statusUpdates: statusUpdate } }
        );

        if (!updatedUsers.matchedCount) {
            console.log("❌ No users found for this hub.");
            return res.status(404).json({ message: 'No users found for this hub.' });
        }

        console.log("✅ All users updated successfully in", hubName);
        res.json({ message: 'Statuses updated successfully' });
    } catch (error) {
        console.error('❌ Error updating statuses:', error);
        res.status(500).json({ message: 'Failed to update statuses.', error: error.message });
    }
});


// Start server
app.listen(PORT, () => console.log(`🚀 Admin server running on http://localhost:${PORT}`));
