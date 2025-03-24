const supabase = require('../utils/supabaseClient');
const jwt = require('jsonwebtoken');
const { encryptText, decryptText } = require('../utils/encryption');

//====================================
// Client Controllers
//====================================

// Generate JWT Token for clients
const generateToken = (client) => {
  return jwt.sign(
    { 
      id: client.id, 
      email: client.email, 
      prospectus_id: client.prospectus_id,
      role: 'client'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

exports.loginClient = async (req, res) => {
  console.log('Executing: loginClient');
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Get client by email
    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        *,
        prospectus:prospectus_id(
          id,
          client_name,
          mobile,
          email
        )
      `)
      .eq('email', email.toLowerCase())
      .single();

    if (error || !client) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }

    // Verify password
    const decryptedPassword = decryptText(client.password);
    if (password !== decryptedPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }

    // Create token
    const token = generateToken(client);

    // Remove password from response
    const { password: _, ...clientData } = client;

    res.status(200).json({
      success: true,
      token,
      data: clientData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in loginClient:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

exports.getAllClients = async (req, res) => {
    console.log('Executing: getAllClients');

    try {
        const { data, error } = await supabase
            .from('clients')
            .select(`
                *,
                prospectus:prospectus_id(
                    id,
                    client_name,
                    mobile,
                    email
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.log('Error fetching clients:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        // Remove encrypted passwords from response
        const clientsWithoutPasswords = data.map(client => {
            const { password, ...clientWithoutPassword } = client;
            return clientWithoutPassword;
        });

        res.status(200).json({
            success: true,
            data: clientsWithoutPasswords,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getAllClients:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

exports.getClientById = async (req, res) => {
    console.log('Executing: getClientById');
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('clients')
            .select(`
                *,
                prospectus:prospectus_id(
                    id,
                    client_name,
                    mobile,
                    email
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.log('Error fetching client:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Client not found',
                timestamp: new Date().toISOString()
            });
        }

        // Remove password from response
        const { password, ...clientWithoutPassword } = data;

        res.status(200).json({
            success: true,
            data: clientWithoutPassword,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getClientById:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

exports.getClientByEmail = async (req, res) => {
    console.log('Executing: getClientByEmail');
    const { email } = req.params;

    try {
        const { data, error } = await supabase
            .from('clients')
            .select(`
                *,
                prospectus:prospectus_id(
                    id,
                    client_name,
                    mobile,
                    email
                )
            `)
            .eq('email', email.toLowerCase())
            .single();

        if (error) {
            console.log('Error fetching client by email:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Client not found',
                timestamp: new Date().toISOString()
            });
        }

        // Remove password from response
        const { password, ...clientWithoutPassword } = data;

        res.status(200).json({
            success: true,
            data: clientWithoutPassword,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getClientByEmail:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

exports.createClient = async (req, res) => {
    console.log('Executing: createClient');
    const { prospectus_id, email, password } = req.body;
    
    console.log('Create client request:', { prospectus_id, email, password: '***' });

    try {
        // Validate required fields
        if (!prospectus_id || !email || !password) {
            console.log('Validation error: Missing required fields', { 
                prospectus_id: !!prospectus_id, 
                email: !!email, 
                password: !!password 
            });
            return res.status(400).json({
                success: false,
                error: 'Prospectus ID, email, and password are required',
                timestamp: new Date().toISOString()
            });
        }

        // Check if prospectus exists
        console.log('Checking if prospectus exists:', prospectus_id);
        const { data: prospectusData, error: prospectusError } = await supabase
            .from('prospectus')
            .select('id')
            .eq('id', prospectus_id)
            .single();

        if (prospectusError) {
            console.log('Error checking prospectus:', prospectusError);
            return res.status(400).json({
                success: false,
                error: 'Invalid prospectus ID: ' + prospectusError.message,
                timestamp: new Date().toISOString()
            });
        }

        if (!prospectusData) {
            console.log('Prospectus not found with ID:', prospectus_id);
            return res.status(400).json({
                success: false,
                error: 'Invalid prospectus ID: Prospectus not found',
                timestamp: new Date().toISOString()
            });
        }

        // Check if email is already used
        console.log('Checking if email already exists:', email.toLowerCase());
        const { data: existingClient, error: checkError } = await supabase
            .from('clients')
            .select(`
                *,
                prospectus:prospectus_id(
                    id,
                    client_name,
                    email
                )
            `)
            .eq('email', email.toLowerCase())
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 is the "no rows returned" error, which is expected
            console.log('Error checking existing email:', checkError);
            return res.status(400).json({
                success: false,
                error: 'Error checking email: ' + checkError.message,
                timestamp: new Date().toISOString()
            });
        }

        if (existingClient) {
            console.log('Email already in use, returning existing client:', email.toLowerCase());
            // Remove password from response
            const { password: _, ...clientWithoutPassword } = existingClient;
            
            return res.status(200).json({
                success: true,
                data: clientWithoutPassword,
                emailExists: true,
                message: 'Email is already in use. Returning existing client details.',
                timestamp: new Date().toISOString()
            });
        }

        // Encrypt password
        console.log('Encrypting password');
        const encryptedPassword = encryptText(password);

        console.log('Creating new client in database');
        const { data, error } = await supabase
            .from('clients')
            .insert([{
                prospectus_id,
                email: email.toLowerCase(),
                password: encryptedPassword
            }])
            .select()
            .single();

        if (error) {
            console.log('Error creating client in database:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        // Remove encrypted password from response
        const { password: _, ...clientWithoutPassword } = data;
        console.log('Client created successfully:', clientWithoutPassword);
        
        res.status(201).json({
            success: true,
            data: clientWithoutPassword,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Unexpected error in createClient:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.updateClient = async (req, res) => {
    console.log('Executing: updateClient');
    const { id } = req.params;
    const { prospectus_id, email, password } = req.body;

    try {
        // Validate existing client
        const { data: existingClient, error: fetchError } = await supabase
            .from('clients')
            .select('id')
            .eq('id', id)
            .single();

        if (fetchError || !existingClient) {
            return res.status(404).json({
                success: false,
                error: 'Client not found',
                timestamp: new Date().toISOString()
            });
        }

        // Build update object
        const updateData = {};
        
        if (prospectus_id) {
            // Check if prospectus exists
            const { data: prospectusData, error: prospectusError } = await supabase
                .from('prospectus')
                .select('id')
                .eq('id', prospectus_id)
                .single();

            if (prospectusError || !prospectusData) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid prospectus ID',
                    timestamp: new Date().toISOString()
                });
            }
            updateData.prospectus_id = prospectus_id;
        }

        if (email) {
            // Check if email is already used by another client
            const { data: emailExists, error: emailCheckError } = await supabase
                .from('clients')
                .select('id')
                .eq('email', email.toLowerCase())
                .neq('id', id)
                .single();

            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    error: 'Email is already in use by another client',
                    timestamp: new Date().toISOString()
                });
            }
            updateData.email = email.toLowerCase();
        }

        if (password) {
            updateData.password = encryptText(password);
        }

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('clients')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.log('Error updating client:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        // Remove password from response
        const { password: _, ...clientWithoutPassword } = data;

        res.status(200).json({
            success: true,
            data: clientWithoutPassword,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in updateClient:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

exports.deleteClient = async (req, res) => {
    console.log('Executing: deleteClient');
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (error) {
            console.log('Error deleting client:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            message: 'Client deleted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in deleteClient:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};
