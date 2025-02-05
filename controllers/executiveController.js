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
  console.log('Executing: loginExecutive');
  const { username, password } = req.body;

  const { data: executive, error } = await supabase
    .from('executive')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !executive) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValidPassword = await bcrypt.compare(password, executive.password);
  if (!isValidPassword) {
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
  
  res.status(200).json(response);
};

exports.createExecutive = async (req, res) => {
  console.log('Executing: createExecutive');
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
  console.log('Executing: getAllExecutives');
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
  
  res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
};

// Added prospectus-related functions
exports.createProspectus = async (req, res) => {
  console.log('Executing: createProspectus');
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
  console.log('Executing: getProspectus');
  const { data, error } = await supabase
    .from('prospectus')
    .select(`
      *,
      executive:executive_id (
        id,
        username,
        email
      )
    `)
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
  console.log('Executing: getProspectusByExecutiveId');
  const { executiveId } = req.params;

  const { data, error } = await supabase
    .from('prospectus')
    .select('*')
    .eq('executive_id', executiveId)
    .not('isregistered', 'eq', true);
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

exports.getProspectusByRegId = async (req, res) => {
  console.log('Executing: getProspectusByRegId');
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

  res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
};

exports.getRegistrationsByExecutiveId = async (req, res) => {
  console.log('Executing: getRegistrationsByExecutiveId');
  const { executiveId } = req.params;

  // First get all prospectus IDs for this executive
  const { data: prospectusData, error: prospectusError } = await supabase
    .from('prospectus')
    .select('id')
    .eq('executive_id', executiveId);

  if (prospectusError) {
    return res.status(400).json({
      success: false,
      error: prospectusError.message,
      timestamp: new Date().toISOString()
    });
  }

  if (!prospectusData.length) {
    return res.status(200).json({
      success: true,
      data: [],
      message: 'No prospectus found for this executive',
      timestamp: new Date().toISOString()
    });
  }

  // Get all prospectus IDs
  const prospectusIds = prospectusData.map(p => p.id);

  // Then get all registrations for these prospectus IDs
  const { data: registrations, error: registrationError } = await supabase
    .from('registration')
    .select(`
      *,
      prospectus:prospectus_id(*),
      bank_accounts:bank_id(*),
      transactions:transaction_id(
        *,
        executive:exec_id(*)
      )
    `)
    .in('prospectus_id', prospectusIds)
    .order('created_at', { ascending: false });

  if (registrationError) {
    return res.status(400).json({
      success: false,
      error: registrationError.message,
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    success: true,
    data: registrations,
    timestamp: new Date().toISOString()
  });
};

exports.updateProspectus = async (req, res) => {
    console.log('Executing: updateProspectus');
    const { id } = req.params;
    const {
        clientEmail,
        clientName,
        date,
        department,
        otherDepartment,
        period,
        phone,
        proposedService,
        requirement,
        state,
        techPerson,
        notes,
        nextFollowUp
    } = req.body;

    const { data, error } = await supabase
        .from('prospectus')
        .update({
            date,
            email: clientEmail,
            client_name: clientName,
            phone:phone,
            department: otherDepartment || department,
            state:state,
            tech_person: techPerson,
            requirement:requirement,
            proposed_service_period: period,
            services: proposedService,
            notes:notes,
            next_follow_up: nextFollowUp,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.log('Error updating prospectus:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    if (!data) {
        return res.status(404).json({
            success: false,
            error: 'Prospectus not found',
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};
