// server.js
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

// Set strictQuery option
mongoose.set('strictQuery', false); // or true, depending on your preference


try{
  mongoose.connect('mongodb://127.0.0.1:27017/crm_db'); // Use 127.0.0.1 instead of localhost
 console.log(`Connection established to Database !!`);
} catch(error){
   console.log("MongoDb Connection Failed:",error);
   process.exit(1);
};

// Models
const customerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  status: String,
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  createdAt: { type: Date, default: Date.now }
});

const agentSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  status: String,
  activeTickets: Number,
  createdAt: { type: Date, default: Date.now }
});

const Customer = mongoose.model('Customer', customerSchema);
const Agent = mongoose.model('Agent', agentSchema);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Customer Routes
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.find().populate('assignedAgent');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    const populatedCustomer = await Customer.findById(customer._id).populate('assignedAgent');
    io.emit('customerAdded', populatedCustomer);
    res.json(populatedCustomer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('assignedAgent');
    io.emit('customerUpdated', customer);
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    io.emit('customerDeleted', req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent Routes
app.get('/api/agents', async (req, res) => {
  try {
    const agents = await Agent.find();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agents', async (req, res) => {
  try {
    const agent = new Agent(req.body);
    await agent.save();
    io.emit('agentAdded', agent);
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/agents/:id', async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    io.emit('agentUpdated', agent);
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/agents/:id', async (req, res) => {
  try {
    await Agent.findByIdAndDelete(req.params.id);
    io.emit('agentDeleted', req.params.id);
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 2000;


function startServer() {
  if (server) {
      console.log(`Server is already running ${PORT}`);
      return; // Prevent starting the server again
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Call the function to start the server
startServer();

// Handle process termination
process.on('SIGINT', () => {
  if (server) {
      server.close(() => {
          console.log('Server closed');
          process.exit(0);
      });
  }
});