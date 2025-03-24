const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = 3019;

// Middleware
app.use(express.static(__dirname)); // Serve static files
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/trackingid', {});
const db = mongoose.connection;

db.once('open', () => console.log('✅ MongoDB connected'));
db.on('error', (error) => console.error('❌ MongoDB connection error:', error));

// Users Schema (Collection: `users`)
const usersSchema = new mongoose.Schema({
    userName: String,
    senderName: String,
    userMobile: String,
    senderMobile: String,
    userAddress: String,
    senderAddress: String,
    trackingId: { type: String, unique: true },
    orderReceivedDate: { type: Date, default: Date.now },
    hub: String,
    vehicleId: String,
    statusUpdates: [
        {
            status: String,
            timestamp: { type: Date, default: Date.now },
        },
    ],
}, { collection: 'users' });

const Users = mongoose.model('Users', usersSchema, 'users');

// Serve Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ Save New Shipment
app.post('/post', async (req, res) => {
    try {
        console.log("📩 Received Data:", req.body);

        const { userName, senderName, userMobile, senderMobile, userAddress, senderAddress, trackingId, hub } = req.body;

        if (!trackingId || !userName || !hub) {
            console.error("❌ Missing required fields.");
            return res.status(400).json({ message: "Missing required fields." });
        }

        const newUser = new Users({
            userName,
            senderName,
            userMobile,
            senderMobile,
            userAddress,
            senderAddress,
            trackingId,
            hub,
            statusUpdates: [{ status: "Order Received", timestamp: new Date() }]
        });

        await newUser.save();
        console.log("✅ User data saved successfully!");
        res.status(201).json({ message: "User data saved successfully", trackingId });
    } catch (error) {
        console.error("❌ Error saving user data:", error);
        res.status(500).json({ message: "Error saving user data", error });
    }
});

// ✅ Get Shipment Details
app.get('/track/:trackingId', async (req, res) => {
    try {
        const { trackingId } = req.params;
        console.log(`🔍 Fetching details for Tracking ID: ${trackingId}`);

        const shipment = await Users.findOne({ trackingId });

        if (!shipment) {
            console.warn(`⚠️ No shipment found for Tracking ID: ${trackingId}`);
            return res.status(404).json({ message: 'Tracking ID not found' });
        }

        console.log("✅ Shipment found:", shipment);
        res.json({ data: shipment });
    } catch (error) {
        console.error("❌ Error fetching tracking details:", error);
        res.status(500).json({ message: 'Server error', error });
    }
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
