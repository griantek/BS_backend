const supabase = require('../utils/supabaseClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { decryptText, encryptText } = require('../utils/encryption');

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
  try {
    console.log('Executing: loginEditor');
    const { username, password } = req.body;

    // Get editor with role and permissions
    const { data: editor, error } = await supabase
      .from('entities')  // Changed from 'executive'
      .select(`
        *,
        role_details:role(
          id,
          name,
          permissions
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
          permissions: permissionDetails
        },
        entity_type: 'Editor',
        created_at: editor.created_at,
        updated_at: editor.updated_at
      }
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in loginEditor:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

// Journal Data CRUD Operations
exports.getAllJournalData = async (req, res) => {
    console.log('Executing: getAllJournalData');
    try {
        const { data, error } = await supabase
            .from('journal_data')
            .select(`
                *,
                entities:assigned_to(
                    id,
                    username,
                    email
                ),
                prospectus:prospectus_id(
                    id,
                    reg_id
                )
            `)
            .order('id', { ascending: true });

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
        const { data: journal, error } = await supabase
            .from('journal_data')
            .select(`
                *,
                entities:assigned_to(
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
        if (!journal) {
            return res.status(404).json({
                success: false,
                error: 'Journal data not found',
                timestamp: new Date().toISOString()
            });
        }

        // Decrypt sensitive fields
        const decryptedData = {
            ...journal,
            username: decryptText(journal.username),
            password: decryptText(journal.password),
            journal_link: decryptText(journal.journal_link)
        };

        res.status(200).json({
            success: true,
            data: decryptedData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getJournalDataById:', error);
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
        assigned_to,
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
        // Encrypt sensitive data
        const encryptedData = {
            username: username ? encryptText(username) : null,
            password: password ? encryptText(password) : null,
            journal_link: journal_link ? encryptText(journal_link) : null
        };

        const { data, error } = await supabase
            .from('journal_data')
            .insert([{
                prospectus_id,
                client_name,
                requirement,
                personal_email,
                assigned_to,
                journal_name,
                status,
                journal_link: encryptedData.journal_link,
                username: encryptedData.username,
                password: encryptedData.password,
                orcid_username1,
                password1,
                paper_title
            }])
            .select()
            .single();

        if (error) throw error;

        // Decrypt the sensitive fields for the response
        const decryptedResponse = {
            ...data,
            username: username,  // Return original values instead of encrypted ones
            password: password,
            journal_link: journal_link
        };

        res.status(201).json({
            success: true,
            data: decryptedResponse,
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
    const updateData = { ...req.body };

    try {
        // Encrypt sensitive fields if they exist in the update data
        if (updateData.username) {
            updateData.username = encryptText(updateData.username);
        }
        if (updateData.password) {
            updateData.password = encryptText(updateData.password);
        }
        if (updateData.journal_link) {
            updateData.journal_link = encryptText(updateData.journal_link);
        }

        // Add updated timestamp
        updateData.updated_at = new Date().toISOString();

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

        // Decrypt sensitive fields for response
        const decryptedData = {
            ...data,
            username: decryptText(data.username),
            password: decryptText(data.password),
            journal_link: decryptText(data.journal_link)
        };

        res.status(200).json({
            success: true,
            data: decryptedData,
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

exports.triggerStatusUpload = async (req, res) => {
    // console.log('Executing: triggerStatusUpload', req.body);
    const { journalId } = req.body;

    if (!journalId) {
        return res.status(400).json({
            success: false,
            error: 'Journal ID is required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        const statusBotUrl = process.env.JSTATUSBOT_URL;
        // console.log('Making request to:', `${statusBotUrl}/upload-status`);
        // console.log('Request body:', { journalId });
        
        const response = await fetch(`${statusBotUrl}/upload-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ journalId })
        });

        // console.log('Raw response:', response);
        const data = await response.json();
        // console.log('Response data:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Error from status upload service');
        }

        // If the external API call was successful, update our database
        if (data.status === 'success') {
            // console.log('Updating journal status in database...');
            const { error: updateError } = await supabase
                .from('journal_data')
                .update({ 
                    updated_at: new Date().toISOString()
                })
                .eq('id', journalId);

            if (updateError) {
                console.error('Error updating journal status:', updateError);
            } else {
                console.log('Journal status updated successfully');
            }
        }

        const finalResponse = {
            success: true,
            data: data.data,
            message: data.message,
            timestamp: new Date().toISOString()
        };
        // console.log('Sending final response:', finalResponse);
        res.status(200).json(finalResponse);

    } catch (error) {
        console.error('Error in triggerStatusUpload:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.getAssignedRegistrations = async (req, res) => {
    console.log('Executing: getAssignedRegistrations');
    const { executive_id } = req.params;

    try {
        // First get all prospectus_ids that are already in journal_data
        const { data: journalData, error: journalError } = await supabase
            .from('journal_data')
            .select('prospectus_id');

        if (journalError) throw journalError;

        // Get the list of prospectus_ids to exclude
        const existingProspectusIds = journalData.map(j => j.prospectus_id).filter(Boolean);
        
        // Step 1: Get registrations with status 'registered' and assigned to the executive
        const { data: registrations, error: registrationError } = await supabase
            .from('registration')
            .select('*, prospectus_id')
            .eq('assigned_to', executive_id)
            .eq('status', 'registered');
            
        if (registrationError) throw registrationError;
        
        // Filter out registrations whose prospectus_ids are already in journal_data
        const filteredRegistrations = registrations.filter(reg => 
            !existingProspectusIds.includes(reg.prospectus_id)
        );
        
        if (filteredRegistrations.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                timestamp: new Date().toISOString()
            });
        }
        
        // Step 2: Fetch prospectus details for the filtered registrations
        const prospectusIds = filteredRegistrations.map(reg => reg.prospectus_id);
        
        const { data: prospectusData, error: prospectusError } = await supabase
            .from('prospectus')
            .select(`
                id, 
                client_name, 
                reg_id, 
                requirement, 
                email,
                entity:entity_id (
                    id,
                    username,
                    email
                )
            `)
            .in('id', prospectusIds);
            
        if (prospectusError) throw prospectusError;
        
        // Step 3: Combine the data
        const combinedData = filteredRegistrations.map(registration => {
            const prospectus = prospectusData.find(p => p.id === registration.prospectus_id);
            return {
                ...registration,
                prospectus: prospectus || null
            };
        });

        res.status(200).json({
            success: true,
            data: combinedData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching assigned registrations:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.getProspectusAssistData = async (req, res) => {
    console.log('Executing: getProspectusAssistData');
    const { prospectus_id } = req.params;

    try {
        const { data, error } = await supabase
            .from('prospectus')
            .select('email, client_name, requirement')
            .eq('id', prospectus_id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Prospectus not found',
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data: {
                personal_email: data.email,
                client_name: data.client_name,
                requirement: data.requirement
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching prospectus assist data:', error);
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
                assigned_to: prospectus.executive_id,
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
