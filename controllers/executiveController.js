const supabase = require('../supabaseClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (executive) => {
  return jwt.sign(
    { id: executive.id, email: executive.email, role: executive.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

exports.loginExecutive = async (req, res) => {
  // console.log('Login Request body:', req.body);
  const { username, password } = req.body;

  const { data: executive, error } = await supabase
    .from('executive')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !executive) {
    // console.log('Login Error:', error || 'Executive not found');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValidPassword = await bcrypt.compare(password, executive.password);
  if (!isValidPassword) {
    // console.log('Login Error: Invalid password');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create token
  const token = generateToken(executive);

  // Remove password from executive object before sending
  const { password: _, ...executiveWithoutPassword } = executive;

  const response = {
    success: true,
    token,
    executive: executiveWithoutPassword
  };
  
  // console.log('Login Success Response:', response);
  res.status(200).json(response);
};

exports.createExecutive = async (req, res) => {
  const { username, password, email, role } = req.body;

  // Basic validation
  if (!username || !password || !email) {
    return res.status(400).json({ error: 'Username, password and email are required' });
  }

  try {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS));

    const { data, error } = await supabase
      .from('executive')
      .insert([
        {
          username,
          password: hashedPassword,
          email,
          role: role || 'executive' // default role if not provided
        }
      ]);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ message: "inserted" });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAllExecutives = async (req, res) => {
  // console.log('Get all executives',req.body);
  const { data, error } = await supabase
    .from('executive')
    .select('id, username, email, role, created_at')  // Explicitly exclude password
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // console.log('Get all executives response:', data);
  res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
};

// Added prospectus-related functions
exports.createProspectus = async (req, res) => {
    // console.log('Request body:', req.body);
    const {
        clientEmail,
        clientId,
        clientName,
        date,
        department,
        otherDepartment,
        period,
        phone,
        proposedService,
        regId,
        requirement,
        state,
        techPerson,
        notes,
        nextFollowUp
    } = req.body;

    const { data, error } = await supabase
        .from('prospectus')
        .insert([{
            date,
            email: clientEmail,
            executive_id: clientId,
            reg_id: regId,
            client_name: clientName,
            phone,
            department: otherDepartment || department,
            state,
            tech_person: techPerson,
            requirement,
            proposed_service_period: period,
            services: proposedService,
            notes:notes,
            next_follow_up: nextFollowUp
        }])
        .select();

    if (error) {
        console.log('Error response:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    res.status(201).json({
        success: true,
        message: "Prospectus created successfully",
        data: data[0],
        timestamp: new Date().toISOString()
    });
};

exports.getProspectus = async (req, res) => {
    const { data, error } = await supabase
        .from('prospectus')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};

exports.getProspectusByExecutiveId = async (req, res) => {
    const { executiveId } = req.params;

    const { data, error } = await supabase
        .from('prospectus')
        .select('*')
        .eq('executive_id', executiveId);

    if (error) {
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    // console.log("data", data);
    res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};

exports.getProspectusByRegId = async (req, res) => {
    // console.log('Request params:', req.params);
    const { regId } = req.params;

    const { data, error } = await supabase
        .from('prospectus')
        .select('*')
        .eq('reg_id', regId)
        .single();

    if (error) {
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
    // console.log("data", data);

    res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};
