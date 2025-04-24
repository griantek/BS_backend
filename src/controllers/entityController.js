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
      .eq('is_deleted', false) // Only select non-deleted entities
      .single();

    if (execError) {
      console.error('Database error fetching executive:', execError);
      return res.status(500).json({
        success: false,
        error: 'Username not found',
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
        is_protected: executive.is_protected,
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

exports.loginLeads = async (req, res) => {
  console.log('Executing: loginLeads');
  const { username, password } = req.body;

  try {
    // Get lead with role details in a single query
    const { data: lead, error: leadError } = await supabase
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
      .eq('role_details.entity_type', 'Leads')
      .eq('is_deleted', false) // Only select non-deleted entities
      .single();

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError || 'Lead not found');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, lead.password);
    if (!isValidPassword) {
      console.log('Invalid password for username:', username);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Get permissions details
    let permissionDetails = [];
    if (lead.role_details?.permissions) {
      const { data: permissions, error: permError } = await supabase
        .from('permissions')
        .select('*')
        .in('id', lead.role_details.permissions);

      if (!permError) {
        permissionDetails = permissions;
      } else {
        console.error('Error fetching permissions:', permError);
      }
    }

    // Create token
    const token = generateToken({
      ...lead,
      role: lead.role_details?.id,
      entity_type: 'Leads'
    });

    // Format the response
    const response = {
      success: true,
      token,
      lead: {
        id: lead.id,
        username: lead.username,
        email: lead.email,
        entity_type: 'Leads',
        role: {
          id: lead.role_details?.id,
          name: lead.role_details?.name || 'Leads',
          description: lead.role_details?.description,
          permissions: permissionDetails.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description
          }))
        },
        created_at: lead.created_at,
        updated_at: lead.updated_at
      }
    };
    res.status(200).json(response);

  } catch (error) {
    console.error('Unexpected error during leads login:', error);
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
    // Check if username already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('entities')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists'
      });
    }

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

exports.getAllEntites = async (req, res) => {
  console.log('Executing: getAllEntites');

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
      .eq('is_deleted', false) // Only select non-deleted entities
      .order('created_at', { ascending: false });

    if (execError) {
      console.log('Error fetching entities:', execError);
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
    console.error('Error in getAllEntites:', error);
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
        notes: notes,
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
      .eq('is_deleted', false) // Only return non-deleted records
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
      count: data.length,  // Add count to response
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
  try {
    console.log('Executing: getProspectusByExecutiveId');
    const { executiveId } = req.params;
    const { data, error } = await supabase
      .from('prospectus')
      .select('*')
      .eq('entity_id', executiveId)
      .eq('is_deleted', false) // Only return non-deleted records
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
      .eq('is_deleted', false) // Only return non-deleted records
      .single();

    if (error) {
      console.log('Error fetching prospectus by regId:', {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
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
    // Get all registrations for the executive with prospectus and leads data
    const { data: registrations, error } = await supabase
      .from('registration')
      .select(`
        *,
        prospectus:prospectus_id(
          *,
          leads:leads_id(*)
        ),
        bank_accounts:bank_id(*),
        transactions:transaction_id(
          *,
          entities:entity_id(*)
        ),
        assigned_executive:assigned_to(
          id,
          username,
          email
        )
      `)
      .eq('registered_by', executiveId)
      .eq('is_deleted', false) // Only return non-deleted records
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error fetching registrations:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Format the response to make it more structured
    // const formattedRegistrations = registrations.map(reg => ({
    //   registration: {
    //     id: reg.id,
    //     date: reg.date,
    //     services: reg.services,
    //     init_amount: reg.init_amount,
    //     secondary_payment: reg.secondary_payment,
    //     final_payment: reg.final_payment,
    //     accept_amount: reg.accept_amount,
    //     discount: reg.discount,
    //     total_amount: reg.total_amount,
    //     accept_period: reg.accept_period,
    //     pub_period: reg.pub_period,
    //     status: reg.status,
    //     month: reg.month,
    //     year: reg.year,
    //     notes: reg.notes,
    //     created_at: reg.created_at,
    //     updated_at: reg.updated_at
    //   },
    //   prospectus: reg.prospectus ? {
    //     id: reg.prospectus.id,
    //     reg_id: reg.prospectus.reg_id,
    //     client_name: reg.prospectus.client_name,
    //     email: reg.prospectus.email,
    //     phone: reg.prospectus.phone,
    //     department: reg.prospectus.department,
    //     state: reg.prospectus.state,
    //     tech_person: reg.prospectus.tech_person,
    //     requirement: reg.prospectus.requirement,
    //     services: reg.prospectus.services,
    //     proposed_service_period: reg.prospectus.proposed_service_period,
    //     notes: reg.prospectus.notes,
    //     next_follow_up: reg.prospectus.next_follow_up,
    //     isregistered: reg.prospectus.isregistered
    //   } : null,
    //   leads: reg.prospectus?.leads ? {
    //     id: reg.prospectus.leads.id,
    //     date: reg.prospectus.leads.date,
    //     lead_source: reg.prospectus.leads.lead_source,
    //     client_name: reg.prospectus.leads.client_name,
    //     phone_number: reg.prospectus.leads.phone_number,
    //     domain: reg.prospectus.leads.domain,
    //     research_area: reg.prospectus.leads.research_area,
    //     requirement: reg.prospectus.leads.requirement,
    //     detailed_requirement: reg.prospectus.leads.detailed_requirement,
    //     prospectus_type: reg.prospectus.leads.prospectus_type,
    //     followup_date: reg.prospectus.leads.followup_date,
    //     followup_status: reg.prospectus.leads.followup_status
    //   } : null,
    //   bank_details: reg.bank_details || null,
    //   transaction: reg.transactions || null
    // }));

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
    // Check if the record is soft-deleted before updating
    const { data: existingProspectus, error: checkError } = await supabase
      .from('prospectus')
      .select('id')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (checkError || !existingProspectus) {
      return res.status(404).json({
        success: false,
        error: 'Prospectus not found or has been deleted',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('prospectus')
      .update({
        date,
        email: clientEmail,
        client_name: clientName,
        phone: phone,
        department: otherDepartment || department,
        state: state,
        tech_person: techPerson,
        requirement: requirement,
        proposed_service_period: period,
        services: proposedService,
        notes: notes,
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
      .from('entities')
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
      .from('entities')
      .select(`
        id, 
        username,
        email,
        role_details:roles!inner(
          id,
          name,
          entity_type
        )
      `)
      .eq('role_details.entity_type', 'Editor')
      .eq('is_deleted', false) // Only select non-deleted entities
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

exports.getAllAuthors = async (req, res) => {
  console.log('Executing: getAllAuthors');

  try {
    const { data: auhtors, error } = await supabase
      .from('entities')
      .select(`
        id, 
        username,
        email,
        role_details:roles!inner(
          id,
          name,
          entity_type
        )
      `)
      .eq('role_details.entity_type', 'Author')
      .eq('is_deleted', false) // Only select non-deleted entities
      .order('username', { ascending: true });

    if (error) {
      console.log('Error fetching authors:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: auhtors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getAllAuthors:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

exports.getAllExecutives = async (req, res) => {
  console.log('Executing: getAllExecutives');

  try {
    const { data: execs, error } = await supabase
      .from('entities')
      .select(`
        id, 
        username,
        email,
        role_details:roles!inner(
          id,
          name,
          entity_type
        )
      `)
      .eq('role_details.entity_type', 'Executive')
      .eq('is_deleted', false) // Only select non-deleted entities
      .order('username', { ascending: true });

    if (error) {
      console.log('Error fetching executives:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: execs,
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

exports.getAllEditorsAndAuthors = async (req, res) => {
  console.log('Executing: getAllEditorsAndAuthors');

  try {
    const { data: entities, error } = await supabase
      .from('entities')
      .select(`
        id, 
        username,
        email,
        role_details:roles!inner(
          id,
          name,
          entity_type
        )
      `)
      .in('role_details.entity_type', ['Editor', 'Author'])
      .eq('is_deleted', false) // Only select non-deleted entities
      .order('username', { ascending: true });

    if (error) {
      console.log('Error fetching editors and authors:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: entities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getAllEditorsAndAuthors:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Verify user password
 * 
 * This function checks if the provided password matches the stored password for an entity
 */
exports.verifyPassword = async (req, res) => {
  console.log('Executing: verifyPassword');
  const { entityId, password } = req.body;

  if (!entityId || !password) {
    return res.status(400).json({
      success: false,
      error: 'Entity ID and password are required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Fetch the entity with the hashed password
    const { data: entity, error } = await supabase
      .from('entities')
      .select('password')
      .eq('id', entityId)
      .eq('is_deleted', false) // Only select non-deleted entities
      .single();

    if (error || !entity) {
      return res.status(404).json({
        success: false,
        error: 'Entity not found',
        timestamp: new Date().toISOString()
      });
    }

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, entity.password);

    // Return error response if password is invalid
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
        timestamp: new Date().toISOString()
      });
    }

    // Only return success if password is valid
    res.status(200).json({
      success: true,
      message: 'Password verification successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while verifying password',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Update user profile information
 * 
 * This function allows updating username and email for an entity
 * if the entity is not protected (is_protected = false)
 */
exports.updateUserProfile = async (req, res) => {
  console.log('Executing: updateUserProfile');
  const { id } = req.params;
  const { username, email } = req.body;

  // Check if at least one field is provided for update
  if (!username && !email) {
    return res.status(400).json({
      success: false,
      error: 'At least one field (username or email) must be provided for update',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // First check if the entity exists and if it is protected
    const { data: existingEntity, error: checkError } = await supabase
      .from('entities')
      .select('id, is_protected')
      .eq('id', id)
      .eq('is_deleted', false) // Only select non-deleted entities
      .single();

    if (checkError || !existingEntity) {
      return res.status(404).json({
        success: false,
        error: 'Entity not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check if entity is protected
    if (existingEntity.is_protected) {
      return res.status(403).json({
        success: false,
        error: 'This entity is protected and cannot be modified',
        timestamp: new Date().toISOString()
      });
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (username) {
      updateData.username = username;
    }

    if (email) {
      // Check if email is already in use by another entity
      const { data: emailCheck, error: emailCheckError } = await supabase
        .from('entities')
        .select('id')
        .eq('email', email)
        .neq('id', id);

      if (!emailCheckError && emailCheck && emailCheck.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Email is already in use by another user',
          timestamp: new Date().toISOString()
        });
      }
      updateData.email = email;
    }

    // Update the entity
    const { data, error } = await supabase
      .from('entities')
      .update(updateData)
      .eq('id', id)
      .select('id, username, email, created_at, updated_at, role')
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data,
      message: 'Profile updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Change user password
 * 
 * This function allows an entity to change their password
 * if the entity is not protected (is_protected = false)
 */
exports.changePassword = async (req, res) => {
  console.log('Executing: changePassword');
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({
      success: false,
      error: 'New password is required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Check if the entity exists and if it is protected
    const { data: existingEntity, error: checkError } = await supabase
      .from('entities')
      .select('id, is_protected')
      .eq('id', id)
      .eq('is_deleted', false) // Only select non-deleted entities
      .single();

    if (checkError || !existingEntity) {
      return res.status(404).json({
        success: false,
        error: 'Entity not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check if entity is protected
    if (existingEntity.is_protected) {
      return res.status(403).json({
        success: false,
        error: 'This entity is protected and cannot have its password changed',
        timestamp: new Date().toISOString()
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS));

    // Update the password
    const { data, error } = await supabase
      .from('entities')
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error changing password:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in changePassword:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get journal data connected to prospectus created by a specific user
 * 
 * This function directly queries journal data associated with prospectus records
 * created by the specified user, and also fetches all public journal data (is_private = FALSE).
 */
exports.getJournalDataByExecutive = async (req, res) => {
  console.log('Executing: getJournalDataByExecutive');
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // First, get all prospectus IDs created by this user
    const { data: prospectusRecords, error: prospectusError } = await supabase
      .from('prospectus')
      .select('id')
      .eq('entity_id', user_id)
      .eq('is_deleted', false); // Only return non-deleted records

    if (prospectusError) {
      console.error('Error fetching prospectus records:', prospectusError);
      return res.status(400).json({
        success: false,
        error: prospectusError.message,
        timestamp: new Date().toISOString()
      });
    }

    // Initialize array to hold all journal data
    let allJournalData = [];

    // If user has prospectus records, fetch related journal data
    if (prospectusRecords && prospectusRecords.length > 0) {
      // Extract prospectus IDs
      const prospectusIds = prospectusRecords.map(p => p.id);
      
      // Set batch size to avoid URI too large error
      const BATCH_SIZE = 20;
      
      // Process in batches
      for (let i = 0; i < prospectusIds.length; i += BATCH_SIZE) {
        const batchIds = prospectusIds.slice(i, i + BATCH_SIZE);
        
        // Query journal data for this batch
        const { data: batchJournalData, error: journalError } = await supabase
          .from('journal_data')
          .select(`
            *,
            prospectus:prospectus_id(
              id,
              reg_id,
              client_name,
              email,
              phone,
              requirement,
              entity_id
            ),
            entities:assigned_to(
              id,
              username,
              email
            )
          `)
          .in('prospectus_id', batchIds)
          .eq('is_deleted', false) // Only return non-deleted records
          .order('created_at', { ascending: false });

        if (journalError) {
          console.error('Error fetching journal data batch:', journalError);
          return res.status(400).json({
            success: false,
            error: journalError.message,
            timestamp: new Date().toISOString()
          });
        }
        
        // Add batch results to the complete result set
        if (batchJournalData && batchJournalData.length > 0) {
          allJournalData = [...allJournalData, ...batchJournalData];
        }
      }
    }

    // Now fetch all public journal data (is_private = FALSE)
    const { data: publicJournalData, error: publicError } = await supabase
      .from('journal_data')
      .select(`
        *,
        prospectus:prospectus_id(
          id,
          reg_id,
          client_name,
          email,
          phone,
          requirement,
          entity_id
        ),
        entities:assigned_to(
          id,
          username,
          email
        )
      `)
      .eq('is_private', false)
      .eq('is_deleted', false) // Only return non-deleted records
      .order('created_at', { ascending: false });

    if (publicError) {
      console.error('Error fetching public journal data:', publicError);
      return res.status(400).json({
        success: false,
        error: publicError.message,
        timestamp: new Date().toISOString()
      });
    }

    // Add public data to the results if any exist
    if (publicJournalData && publicJournalData.length > 0) {
      // Combine both sets and remove duplicates
      const combinedData = [...allJournalData];
      
      publicJournalData.forEach(publicItem => {
        // Check if this item already exists in our data
        if (!combinedData.some(item => item.id === publicItem.id)) {
          combinedData.push(publicItem);
        }
      });
      
      allJournalData = combinedData;
    }

    // Process journals if needed
    const processedJournals = allJournalData.map(journal => {
      // If there are any decryption or transformation needs, handle here
      return {
        ...journal,
        // For sensitive fields like passwords, etc. you might want to exclude them
        username: journal.username ? 'ENCRYPTED' : null,
        password: journal.password ? 'ENCRYPTED' : null
      };
    });

    // Sort the final combined data by created_at
    processedJournals.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    res.status(200).json({
      success: true,
      data: processedJournals,
      count: processedJournals.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getJournalDataByExecutive:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Soft delete an entity by setting is_deleted flag to true
 * 
 * This function marks an entity as deleted without actually removing it from the database,
 * making it unavailable for all functions that respect the is_deleted flag.
 * Protected entities (is_protected = true) cannot be deleted.
 * 
 * @param {object} req - Express request object
 * @param {object} req.params - Request parameters
 * @param {string} req.params.id - Entity ID to delete
 * @param {object} res - Express response object
 * @returns {object} JSON response indicating success or failure
 */
exports.deleteEntity = async (req, res) => {
  console.log('Executing: deleteEntity');
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Entity ID is required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // First check if the entity exists and if it is protected
    const { data: existingEntity, error: checkError } = await supabase
      .from('entities')
      .select('id, is_protected, username')
      .eq('id', id)
      .single();

    if (checkError || !existingEntity) {
      return res.status(404).json({
        success: false,
        error: 'Entity not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check if entity is protected
    if (existingEntity.is_protected) {
      return res.status(403).json({
        success: false,
        error: 'This entity is protected and cannot be deleted',
        timestamp: new Date().toISOString()
      });
    }

    // Soft delete by setting is_deleted flag to true
    const { data, error } = await supabase
      .from('entities')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error soft deleting entity:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: `Entity '${existingEntity.username}' has been soft deleted`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in deleteEntity:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Delete prospectus records by reg_id
 * 
 * This function deletes prospectus records based on the provided registration IDs.
 * It supports deleting multiple records at once.
 * 
 * @param {object} req - Express request object
 * @param {object} req.body - Request body containing registration IDs
 * @param {array} req.body.reg_id - Array of registration IDs to delete
 * @param {object} res - Express response object
 * @returns {object} JSON response indicating success or failure
 */
exports.deleteProspectus = async (req, res) => {
  console.log('Executing: deleteProspectus');
  const { reg_id } = req.body;

  // Validate input
  if (!reg_id || !Array.isArray(reg_id) || reg_id.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'An array of registration IDs is required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Soft delete by setting is_deleted flag to true and recording deletion time
    const { data, error } = await supabase
      .from('prospectus')
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .in('reg_id', reg_id);

    if (error) {
      console.error('Error deleting prospectus:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully soft-deleted ${reg_id.length} prospectus record(s)`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in deleteProspectus:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Soft delete a prospectus record and its dependencies
 * 
 * This function calls the database function 'soft_delete_prospectus_and_dependents'
 * to mark the prospectus and related records as deleted without actually removing them.
 * 
 * @param {object} req - Express request object
 * @param {object} req.params - Request parameters
 * @param {string} req.params.id - Prospectus ID to soft delete
 * @param {object} res - Express response object
 * @returns {object} JSON response indicating success or failure
 */
exports.softDeleteProspectus = async (req, res) => {
  console.log('Executing: softDeleteProspectus');
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Prospectus ID is required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Check if prospectus exists
    const { data: prospectus, error: checkError } = await supabase
      .from('prospectus')
      .select('id')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (checkError || !prospectus) {
      return res.status(404).json({
        success: false,
        error: 'Prospectus not found or already deleted',
        timestamp: new Date().toISOString()
      });
    }

    // Call the database function to soft delete prospectus and its dependencies
    const { data, error } = await supabase.rpc('soft_delete_prospectus_and_dependents', {
      p_id: parseInt(id)
    });

    if (error) {
      console.error('Error soft deleting prospectus:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Prospectus and related records have been soft deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in softDeleteProspectus:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Restore a soft-deleted prospectus record and its dependencies
 * 
 * This function calls the database function 'restore_prospectus_and_dependents'
 * to restore the prospectus and related records that were previously soft-deleted.
 * 
 * @param {object} req - Express request object
 * @param {object} req.params - Request parameters
 * @param {string} req.params.id - Prospectus ID to restore
 * @param {object} res - Express response object
 * @returns {object} JSON response indicating success or failure
 */
exports.restoreProspectus = async (req, res) => {
  console.log('Executing: restoreProspectus');
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Prospectus ID is required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Check if prospectus exists and is deleted
    const { data: prospectus, error: checkError } = await supabase
      .from('prospectus')
      .select('id')
      .eq('id', id)
      .eq('is_deleted', true)
      .single();

    if (checkError || !prospectus) {
      return res.status(404).json({
        success: false,
        error: 'Prospectus not found or not deleted',
        timestamp: new Date().toISOString()
      });
    }

    // Call the database function to restore prospectus and its dependencies
    const { data, error } = await supabase.rpc('restore_prospectus_and_dependents', {
      p_id: parseInt(id)
    });

    if (error) {
      console.error('Error restoring prospectus:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Prospectus and related records have been restored',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in restoreProspectus:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get all soft-deleted prospectus records
 * 
 * This function retrieves all prospectus records that have been soft-deleted
 * for viewing in a recycle bin or restoration interface.
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @returns {object} JSON response with deleted prospectus data or error
 */
exports.getDeletedProspectus = async (req, res) => {
  console.log('Executing: getDeletedProspectus');

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
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error fetching deleted prospectus records:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data,
      count: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getDeletedProspectus:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};
