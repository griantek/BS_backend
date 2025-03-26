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
            prospectus_ids: client.prospectus_ids,
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
        // Now get the full client data with prospectus
        const { data, error } = await supabase
            .from('clients')
            .select(`*`)
            .eq('email', email.toLowerCase())
            .single();
        
        if (error) {
            console.log('Error fetching client details:', error);
            return res.status(401).json({
                success: false,
                error: 'Error retrieving client details',
                timestamp: new Date().toISOString()
            });
        }

        // Verify password
        const decryptedPassword = decryptText(data.password);
        if (password !== decryptedPassword) {
            console.log('Password mismatch for client:', email);
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                timestamp: new Date().toISOString()
            });
        }

        // Fetch prospectus data if there are any prospectus IDs
        let prospectusData = [];
        if (data.prospectus_ids && data.prospectus_ids.length > 0) {
            const { data: prospectusResult, error: prospectusError } = await supabase
                .from('prospectus')
                .select('id, client_name, phone, email')
                .in('id', data.prospectus_ids);
                
            if (!prospectusError) {
                prospectusData = prospectusResult;
            }
        }

        // Create token
        const token = generateToken(data);

        // Remove password from response
        const { password: _, ...clientData } = data;
        
        // Add the prospectus data to the response
        clientData.prospectus = prospectusData;

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
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.log('Error fetching clients:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        // Gather all unique prospectus IDs from all clients
        const allProspectusIds = new Set();
        data.forEach(client => {
            if (client.prospectus_ids && client.prospectus_ids.length > 0) {
                client.prospectus_ids.forEach(id => allProspectusIds.add(id));
            }
        });

        // Fetch all prospectus data in a single query if there are any IDs
        let prospectusMap = {};
        if (allProspectusIds.size > 0) {
            const { data: prospectusData, error: prospectusError } = await supabase
                .from('prospectus')
                .select('id, client_name, mobile, email')
                .in('id', Array.from(allProspectusIds));

            if (!prospectusError && prospectusData) {
                // Create a map for easy lookup
                prospectusMap = prospectusData.reduce((acc, p) => {
                    acc[p.id] = p;
                    return acc;
                }, {});
            }
        }

        // Add prospectus data to each client and remove passwords
        const clientsWithoutPasswords = data.map(client => {
            const { password, ...clientWithoutPassword } = client;
            
            // Add the prospectus data for each client
            clientWithoutPassword.prospectus = (client.prospectus_ids || [])
                .map(id => prospectusMap[id])
                .filter(p => p); // Filter out any undefined values
                
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
            .select('*')
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

        // Fetch prospectus data if there are any IDs
        let prospectusData = [];
        if (data.prospectus_ids && data.prospectus_ids.length > 0) {
            const { data: prospectusResult, error: prospectusError } = await supabase
                .from('prospectus')
                .select('id, client_name, phone, email')
                .in('id', data.prospectus_ids);
                
            if (!prospectusError) {
                prospectusData = prospectusResult;
            }
        }

        // Log the decrypted password for debugging
        const decryptedPassword = decryptText(data.password);
        console.log('Client ID:', id);
        console.log('Email:', data.email);
        console.log('Encrypted password:', data.password);
        console.log('Decrypted password:', decryptedPassword);

        // Remove password from response
        const { password, ...clientWithoutPassword } = data;
        
        // Add prospectus data to the response
        clientWithoutPassword.prospectus = prospectusData;

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
            .select('*')
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

        // Fetch prospectus data if there are any IDs
        let prospectusData = [];
        if (data.prospectus_ids && data.prospectus_ids.length > 0) {
            const { data: prospectusResult, error: prospectusError } = await supabase
                .from('prospectus')
                .select('id, client_name, mobile, email')
                .in('id', data.prospectus_ids);
                
            if (!prospectusError) {
                prospectusData = prospectusResult;
            }
        }

        // Remove password from response
        const { password, ...clientWithoutPassword } = data;
        
        // Add prospectus data to the response
        clientWithoutPassword.prospectus = prospectusData;

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

/**
 * Creates a new client or updates an existing client with a new prospectus ID
 * 
 * This function handles:
 * 1. Creating a new client with a prospectus ID if the email doesn't exist
 * 2. Adding a new prospectus ID to an existing client's array if email exists
 * 3. Returning existing client data if email exists but no new prospectus ID is added
 * 
 * @param {object} req - Express request object
 * @param {object} req.body - Request body containing client data
 * @param {number} req.body.prospectus_id - A single prospectus ID to associate with the client
 * @param {string} req.body.email - Client's email address (used as unique identifier)
 * @param {string} req.body.password - Client's password (will be encrypted)
 * @param {object} res - Express response object
 * @returns {object} JSON response with client data or error
 */
exports.createClient = async (req, res) => {
    console.log('Executing: createClient');
    const { prospectus_id, email, password } = req.body;

    try {
        // Step 1: Validate required fields
        if (!email) {
            console.log('Missing required fields:', req.body); 
            return res.status(400).json({
                success: false,
                error: 'Email is required',
                timestamp: new Date().toISOString()
            });
        }

        // Step 2: Validate the prospectus_id exists in the database (if provided)
        if (prospectus_id) {
            const { data: prospectusData, error: prospectusError } = await supabase
                .from('prospectus')
                .select('id')
                .eq('id', prospectus_id)
                .single();

            if (prospectusError) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid prospectus ID: ' + prospectusError.message,
                    timestamp: new Date().toISOString()
                });
            }

            if (!prospectusData) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid prospectus ID: Prospectus not found',
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Step 3: Check if a client with this email already exists
        const { data: existingClient, error: checkError } = await supabase
            .from('clients')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        // Handle query errors except for "not found" error (PGRST116)
        if (checkError && checkError.code !== 'PGRST116') {
            return res.status(400).json({
                success: false,
                error: 'Error checking email: ' + checkError.message,
                timestamp: new Date().toISOString()
            });
        }

        // Step 4: If client already exists, handle the prospectus_id appropriately
        if (existingClient) {
            // Step 4.1: If a new prospectus_id was provided, try to add it to the existing array
            if (prospectus_id) {
                
                // Get existing prospectus IDs array (or empty array if none)
                const existingIds = existingClient.prospectus_ids || [];
                
                // Ensure all IDs are numbers for consistent comparison
                const numericExistingIds = existingIds.map(id => Number(id));
                const numericProspectusId = Number(prospectus_id);
                
                // Only add the new ID if it's not already in the array (prevent duplicates)
                if (!numericExistingIds.includes(numericProspectusId)) {
                    
                    // Create a new array with the existing IDs plus the new one
                    const combinedIds = [...numericExistingIds, numericProspectusId];
                    
                    // Step 4.2: Update the client with the new combined array of prospectus IDs
                    const { data: updatedClient, error: updateError } = await supabase
                        .from('clients')
                        .update({ 
                            prospectus_ids: combinedIds,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingClient.id)
                        .select()
                        .single();
                    
                    if (updateError) {
                        console.error('Error updating client with new prospectus ID:', updateError);
                        return res.status(400).json({
                            success: false,
                            error: 'Failed to update client with new prospectus ID: ' + updateError.message,
                            timestamp: new Date().toISOString()
                        });
                    }
                    
                    // Step 4.3: Fetch prospectus data for all IDs to include in the response
                    let prospectusData = [];
                    const { data: prospectusResult, error: prospectusError } = await supabase
                        .from('prospectus')
                        .select('id, client_name, email')
                        .in('id', combinedIds);
                        
                    if (!prospectusError) {
                        prospectusData = prospectusResult;
                    }
                    
                    // Step 4.4: Remove password from response for security
                    const { password: _, ...clientWithoutPassword } = updatedClient;
                    clientWithoutPassword.prospectus = prospectusData;
                    
                    // Return the updated client data with a message that we added the new ID
                    return res.status(200).json({
                        success: true,
                        data: clientWithoutPassword,
                        emailExists: true,
                        message: 'Email already exists. Added new prospectus ID to existing client.',
                        timestamp: new Date().toISOString()
                    });
                } else {
                    console.log(`Prospectus ID ${prospectus_id} is already in the client's array`);
                }
            }
            
            // Fetch associated prospectus data for the response
            let prospectusData = [];
            if (existingClient.prospectus_ids && existingClient.prospectus_ids.length > 0) {
                const { data: prospectusResult, error: prospectusError } = await supabase
                    .from('prospectus')
                    .select('id, client_name, email')
                    .in('id', existingClient.prospectus_ids);
                    
                if (!prospectusError) {
                    prospectusData = prospectusResult;
                }
            }
            
            // Remove password from response for security
            const { password: _, ...clientWithoutPassword } = existingClient;
            clientWithoutPassword.prospectus = prospectusData;

            // Return the existing client data with a message that the email already exists
            return res.status(200).json({
                success: true,
                data: clientWithoutPassword,
                emailExists: true,
                message: 'Email is already in use. Returning existing client details.',
                timestamp: new Date().toISOString()
            });
        }

        // Step 5: If client doesn't exist, create a new client record
        // Encrypt the password for secure storage
        const encryptedPassword = encryptText(password);
        
        // Create an array with the prospectus_id if provided, or empty array if not
        const prospectusIdsArray = prospectus_id ? [prospectus_id] : [];

        // Step 5.1: Insert the new client record with the prospectus_ids array
        const { data, error } = await supabase
            .from('clients')
            .insert([{
                prospectus_ids: prospectusIdsArray,
                email: email.toLowerCase(), // Store email in lowercase for consistent lookups
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

        // Step 5.2: Fetch prospectus data for the response (if any prospectus IDs)
        let prospectusData = [];
        if (prospectusIdsArray.length > 0) {
            const { data: prospectusResult, error: prospectusError } = await supabase
                .from('prospectus')
                .select('id, client_name, email')
                .in('id', prospectusIdsArray);
                
            if (!prospectusError) {
                prospectusData = prospectusResult;
            }
        }

        // Step 5.3: Remove encrypted password from response for security
        const { password: _, ...clientWithoutPassword } = data;
        clientWithoutPassword.prospectus = prospectusData;

        // Return the new client data with 201 Created status
        res.status(201).json({
            success: true,
            data: clientWithoutPassword,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        // Handle any unexpected errors
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
    const { prospectus_ids, email, password } = req.body;

    try {
        // Validate existing client
        const { data: existingClient, error: fetchError } = await supabase
            .from('clients')
            .select('id, prospectus_ids')
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

        if (prospectus_ids !== undefined) {
            // Ensure prospectus_ids is an array
            const prospectusIdsArray = Array.isArray(prospectus_ids) ? prospectus_ids : [];
            
            // If any prospectus IDs were provided, validate they exist
            if (prospectusIdsArray.length > 0) {
                const { data: prospectusData, error: prospectusError } = await supabase
                    .from('prospectus')
                    .select('id')
                    .in('id', prospectusIdsArray);

                if (prospectusError) {
                    return res.status(400).json({
                        success: false,
                        error: 'Error validating prospectus IDs: ' + prospectusError.message,
                        timestamp: new Date().toISOString()
                    });
                }

                // Check if all requested IDs were found
                const foundIds = new Set(prospectusData.map(p => p.id));
                const missingIds = prospectusIdsArray.filter(id => !foundIds.has(id));
                
                if (missingIds.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid prospectus IDs: ${missingIds.join(', ')} not found`,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
            updateData.prospectus_ids = prospectusIdsArray;
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

        // Fetch prospectus data for the response
        let prospectusData = [];
        if (data.prospectus_ids && data.prospectus_ids.length > 0) {
            const { data: prospectusResult, error: prospectusError } = await supabase
                .from('prospectus')
                .select('id, client_name, email')
                .in('id', data.prospectus_ids);
                
            if (!prospectusError) {
                prospectusData = prospectusResult;
            }
        }

        // Remove password from response
        const { password: _, ...clientWithoutPassword } = data;
        clientWithoutPassword.prospectus = prospectusData;

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
