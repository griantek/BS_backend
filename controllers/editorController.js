const supabase = require('../supabaseClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (editor) => {
  return jwt.sign(
    { 
      id: editor.id, 
      email: editor.email, 
      role: editor.role,
      entity_type: 'Editor'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

exports.loginEditor = async (req, res) => {
  console.log('Executing: loginEditor');
  const { username, password } = req.body;

  // Get editor with role and permissions
  const { data: editor, error } = await supabase
    .from('executive')
    .select(`
      *,
      role_details:role(
        id,
        name,
        permissions,
        dashboard_url
      )
    `)
    .eq('username', username)
    .eq('entity_type', 'Editor')
    .single();

  if (error || !editor) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValidPassword = await bcrypt.compare(password, editor.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Get permissions details
  let permissionDetails = [];
  if (editor.role_details?.permissions) {
    const permissionIds = editor.role_details.permissions;
    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('id, name, description')
      .in('id', permissionIds);

    if (!permError) {
      permissionDetails = permissions;
    }
  }

  // Create token
  const token = generateToken(editor);

  // Format the response
  const response = {
    success: true,
    token,
    editor: {
      id: editor.id,
      username: editor.username,
      email: editor.email,
      role: {
        id: editor.role_details?.id,
        name: editor.role_details?.name || 'No Role',
        dashboard_url: editor.role_details?.dashboard_url || '/default-dashboard',
        permissions: permissionDetails
      },
      created_at: editor.created_at,
      updated_at: editor.updated_at
    }
  };
  
  res.status(200).json(response);
};

// Journal Data CRUD Operations
exports.getAllJournalData = async (req, res) => {
    console.log('Executing: getAllJournalData');
    try {
        const { data, error } = await supabase
            .from('journal_data')
            .select(`
                *,
                executive:applied_person(
                    id,
                    username,
                    email
                ),
                prospectus:prospectus_id(
                    id,
                    reg_id
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching journal data:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.getJournalDataById = async (req, res) => {
    console.log('Executing: getJournalDataById');
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('journal_data')
            .select(`
                *,
                executive:applied_person(
                    id,
                    username,
                    email
                ),
                prospectus:prospectus_id(
                    id,
                    reg_id
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Journal data not found',
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching journal data:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.createJournalData = async (req, res) => {
    console.log('Executing: createJournalData');
    const {
        prospectus_id,
        client_name,
        requirement,
        personal_email,
        applied_person,
        journal_name,
        status,
        journal_link,
        username,
        password,
        orcid_username1,
        password1,
        paper_title
    } = req.body;

    try {
        const { data, error } = await supabase
            .from('journal_data')
            .insert([{
                prospectus_id,
                client_name,
                requirement,
                personal_email,
                applied_person,
                journal_name,
                status,
                journal_link,
                username,
                password,
                orcid_username1,
                password1,
                paper_title
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error creating journal data:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.updateJournalData = async (req, res) => {
    console.log('Executing: updateJournalData');
    const { id } = req.params;
    const updateData = { ...req.body, updated_at: new Date().toISOString() };

    try {
        const { data, error } = await supabase
            .from('journal_data')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Journal data not found',
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating journal data:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.deleteJournalData = async (req, res) => {
    console.log('Executing: deleteJournalData');
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('journal_data')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.status(200).json({
            success: true,
            message: 'Journal data deleted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error deleting journal data:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Alternative version getting data from prospectus table
/*
exports.createJournalDataFromProspectus = async (req, res) => {
    console.log('Executing: createJournalDataFromProspectus');
    const { prospectus_id, journal_name, status, journal_link, ...otherFields } = req.body;

    try {
        // First get prospectus data
        const { data: prospectus, error: prospectusError } = await supabase
            .from('prospectus')
            .select('client_name, requirement, email, executive_id')
            .eq('id', prospectus_id)
            .single();

        if (prospectusError) throw prospectusError;
        if (!prospectus) throw new Error('Prospectus not found');

        // Create journal data with prospectus information
        const { data, error } = await supabase
            .from('journal_data')
            .insert([{
                prospectus_id,
                client_name: prospectus.client_name,
                requirement: prospectus.requirement,
                personal_email: prospectus.email,
                applied_person: prospectus.executive_id,
                journal_name,
                status,
                journal_link,
                ...otherFields
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error creating journal data:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
*/

// Add other editor-specific functions here...
