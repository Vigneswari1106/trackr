const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = 3030;

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
    senderAddress: { type: String, required: true },
    statusUpdates: { type: [{ status: String, timestamp: String }], default: [] }
});

const User = mongoose.model('User', userSchema);

// Admin Credentials for 38 Districts
const adminCredentials = {
    "ariyalur@courier.com": "ari12345",
    "chengalpattu@courier.com": "che12345",
    "chennai@courier.com": "chn12345",
    "coimbatore@courier.com": "coi12345",
    "cuddalore@courier.com": "cud12345",
    "dharmapuri@courier.com": "dhar12345",
    "dindigul@courier.com": "din12345",
    "erode@courier.com": "ero12345",
    "kallakurichi@courier.com": "kal12345",
    "kanchipuram@courier.com": "kan12345",
    "kanyakumari@courier.com": "kan12345",
    "karur@courier.com": "kar12345",
    "krishnagiri@courier.com": "kri12345",
    "madurai@courier.com": "mad12345",
    "mayiladuthurai@courier.com": "may12345",
    "nagapattinam@courier.com": "nag12345",
    "namakkal@courier.com": "nam12345",
    "nilgiris@courier.com": "nil12345",
    "perambalur@courier.com": "per12345",
    "pudukkottai@courier.com": "pud12345",
    "ramanathapuram@courier.com": "ram12345",
    "ranipet@courier.com": "ran12345",
    "salem@courier.com": "sal12345",
    "sivaganga@courier.com": "siv12345",
    "tenkasi@courier.com": "ten12345",
    "thanjavur@courier.com": "tha12345",
    "theni@courier.com": "the12345",
    "thoothukudi@courier.com": "tho12345",
    "tiruchirappalli@courier.com": "tri12345",
    "tirunelveli@courier.com": "tir12345",
    "tirupathur@courier.com": "tip12345",
    "tiruppur@courier.com": "tup12345",
    "tiruvallur@courier.com": "tvl12345",
    "tiruvannamalai@courier.com": "tvm12345",
    "tiruvarur@courier.com": "tvv12345",
    "vellore@courier.com": "vel12345",
    "viluppuram@courier.com": "vil12345",
    "virudhunagar@courier.com": "vir12345",
};

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// Route for district admin login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'district-login.html'));
});

// Admin login route
app.post('/district-login', (req, res) => {
    const { email, password } = req.body;

    if (adminCredentials[email] && adminCredentials[email] === password) {
        const district = email.split('@')[0];
        return res.redirect(`/district/${district}`);
    }

    res.status(401).send('<h3 style="color: red;">Invalid email or password</h3>');
});

// Route to display city selection
app.get('/district/:district', (req, res) => {
    res.sendFile(path.join(__dirname, 'district-tracking.html'));
});

// API to fetch tracking IDs for selected city
app.get('/get-tracking-ids/:city', async (req, res) => {
    try {
        const city = req.params.city;
        const users = await User.find({ senderAddress: { $regex: `\\b${city}\\b`, $options: 'i' } });

        res.json(users);
    } catch (error) {
        console.error('❌ Error fetching tracking details:', error);
        res.status(500).json({ message: 'Error fetching tracking details' });
    }
});
app.get('/tracking/:city', (req, res) => {
    res.sendFile(path.join(__dirname, 'tracking-details.html'));
});

// Route to mark selected tracking IDs as Delivered
app.put('/mark-delivered', async (req, res) => {
    try {
        const { trackingIds } = req.body;

        if (!trackingIds || trackingIds.length === 0) {
            return res.status(400).json({ message: 'No tracking IDs selected' });
        }

        const now = new Date();
        const ISTTime = now.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: "Asia/Kolkata" });
        const ISTDate = now.toLocaleDateString("en-IN", { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: "Asia/Kolkata" });
        const currentTime = `${ISTDate} ${ISTTime}`;

        const statusUpdate = { status: "Delivered", timestamp: currentTime };

        // Update only selected tracking IDs
        await User.updateMany(
            { trackingId: { $in: trackingIds } }, 
            { $push: { statusUpdates: statusUpdate } }
        );

        res.json({ message: "Selected tracking IDs marked as Delivered." });

    } catch (error) {
        console.error('❌ Error updating delivery status:', error);
        res.status(500).json({ message: 'Error updating delivery status' });
    }
});


// Route to update status
app.put('/update-status', async (req, res) => {
    try {
        const { city } = req.body;

        if (!city) {
            return res.status(400).json({ message: 'City is required' });
        }

        const now = new Date();
        const ISTTime = now.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: "Asia/Kolkata" });
        const ISTDate = now.toLocaleDateString("en-IN", { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: "Asia/Kolkata" });
        const currentTime = `${ISTDate} ${ISTTime}`;

        const statusUpdate = { status: `Your courier reached ${city}`, timestamp: currentTime };

        const updatedUsers = await User.updateMany(
            { senderAddress: { $regex: `\\b${city}\\b`, $options: 'i' } },
            { $push: { statusUpdates: statusUpdate } }
        );

        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error('❌ Error updating status:', error);
        res.status(500).json({ message: 'Failed to update status' });
    }
});

// Start server
app.listen(PORT, () => console.log(`🚀 District admin server running on http://localhost:${PORT}`));
