const supabase = require('../utils/supabaseClient');
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

  try {
    // First query: Get executive with role details in a single query
    const { data: executive, error: execError } = await supabase
      .from('entities')
      .select(`
        *,
        role_details:roles!role(
          id,
          name,
          description,
          permissions,
          entity_type
        )
      `)
      .eq('username', username)
      .single();

    if (execError) {
      console.error('Database error fetching executive:', execError);
      return res.status(500).json({
        success: false,
        error: 'Database error occurred'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, executive.password);
    if (!isValidPassword) {
      console.log('Invalid password for username:', username);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Get permissions details
    let permissionDetails = [];
    if (executive.role_details?.permissions) {
      const { data: permissions, error: permError } = await supabase
        .from('permissions')
        .select('*')
        .in('id', executive.role_details.permissions);

      if (!permError) {
        permissionDetails = permissions;
      } else {
        console.error('Error fetching permissions:', permError);
      }
    }

    // Create token
    const token = generateToken({
      ...executive,
      role: executive.role_details?.id,
      entity_type: executive.role_details?.entity_type
    });

    // Format the response
    const response = {
      success: true,
      token,
      entities: {
        id: executive.id,
        username: executive.username,
        email: executive.email,
        entity_type: executive.role_details?.entity_type || 'Executive',
        role: {
          id: executive.role_details?.id,
          name: executive.role_details?.name || 'No Role',
          description: executive.role_details?.description,
          permissions: permissionDetails.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description
          }))
        },
        created_at: executive.created_at,
        updated_at: executive.updated_at
      }
    };
    res.status(200).json(response);

  } catch (error) {
    console.error('Unexpected error during login:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during login'
    });
  }
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
      .from('entities')  // Changed from 'executive'
      .insert([{
        username,
        password: hashedPassword,
        email,
        role: role || 'executive',
      }]);

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
  
  try {
    const { data: executives, error: execError } = await supabase
      .from('entities')  // Changed from 'executive'
      .select(`
        *,
        role_details:roles!role(
          id,
          name,
          description,
          permissions,
          entity_type
        )
      `)
      .order('created_at', { ascending: false });

    if (execError) {
      console.log('Error fetching executives:', execError);
      return res.status(400).json({
        success: false,
        error: execError.message,
        timestamp: new Date().toISOString()
      });
    }

    // Format response and remove sensitive data
    const formattedData = executives.map(executive => ({
      ...executive,
      role_name: executive.role_details?.name || 'No Role Assigned',
      role_permissions: executive.role_details?.permissions || {},
      password: undefined // Remove password from response
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getAllExecutives:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
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

  try {
    const { data, error } = await supabase
      .from('prospectus')
      .insert([{
        date,
        email: clientEmail,
        entity_id: clientId,  // Changed from executive_id
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
  } catch (error) {
    console.error('Error in createProspectus:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

exports.getProspectus = async (req, res) => {
  console.log('Executing: getProspectus');
  
  try {
    const { data, error } = await supabase
      .from('prospectus')
      .select(`
        *,
        entities:entity_id (
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
  } catch (error) {
    console.error('Error in getProspectus:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

exports.getProspectusByExecutiveId = async (req, res) => {
  try{
  console.log('Executing: getProspectusByExecutiveId');
  const { executiveId } = req.params;
    const { data, error } = await supabase
      .from('prospectus')
      .select('*')
      .eq('entity_id', executiveId)  // Changed from executive_id
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
  } catch (error) {
    console.error('Error in getProspectusByExecutiveId:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

exports.getProspectusByRegId = async (req, res) => {
  console.log('Executing: getProspectusByRegId');
  const { regId } = req.params;

  try {
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
  } catch (error) {
    console.error('Error in getProspectusByRegId:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

exports.getRegistrationsByExecutiveId = async (req, res) => {
  console.log('Executing: getRegistrationsByExecutiveId');
  const { executiveId } = req.params;

  try {
    // Get registrations directly using registered_by field
    const { data: registrations, error: registrationError } = await supabase
      .from('registration')
      .select(`
        *,
        prospectus:prospectus_id(*),
        bank_accounts:bank_id(*),
        transactions:transaction_id(
          *,
          entities:entity_id(*)
        )
      `)
      .eq('registered_by', executiveId)  // Changed from prospectus query to direct registered_by field
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
  } catch (error) {
    console.error('Error in getRegistrationsByExecutiveId:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
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

  try {
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
  } catch (error) {
    console.error('Error in updateProspectus:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

exports.updateExecutive = async (req, res) => {
  console.log('Executing: updateExecutive');
  const { id } = req.params;
  const { username, email, role, password } = req.body;

  try {
    // Prepare update object
    const updateData = {
      username,
      email,
      role,
      updated_at: new Date().toISOString()
    };

    // If password is provided, hash it
    if (password) {
      updateData.password = await bcrypt.hash(
        password, 
        parseInt(process.env.BCRYPT_SALT_ROUNDS)
      );
    }

    // Update executive
    const { data, error } = await supabase
      .from('entities')  // Changed from 'executive'
      .update(updateData)
      .eq('id', id)
      .select('id, username, email, role, created_at, updated_at') // Exclude password from response
      .single();

    if (error) {
      console.log('Error updating executive:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Executive not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log('Server error updating executive:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      timestamp: new Date().toISOString()
    });
  }
};

exports.getAllEditors = async (req, res) => {
  console.log('Executing: getAllEditors');
  
  try {
    const { data: editors, error } = await supabase
      .from('entities')  // Changed from 'executive'
      .select('id, username')
      .eq('entity_type', 'Editor')
      .order('username', { ascending: true });

    if (error) {
      console.log('Error fetching editors:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: editors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getAllEditors:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};
