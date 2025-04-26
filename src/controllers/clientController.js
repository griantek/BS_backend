const supabase = require('../utils/supabaseClient');
const jwt = require('jsonwebtoken');
const { encryptText, decryptText } = require('../utils/encryption');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Use memory storage for temporary file handling
const paymentStorage = multer.memoryStorage();
const uploadPaymentFiles = multer({
    storage: paymentStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        // Accept documents and image files
        const allowedFileTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedFileTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG, and TXT files are allowed.'));
        }
    }
}).array('files[]', 5); // Changed 'files' to 'files[]' to match the field name sent from frontend

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
        // Get client data from database
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

        // Encrypt the input password and compare with stored encrypted password
        const encryptedInputPassword = encryptText(password);
        console.log('Password comparison:');
        console.log('Input password encrypted:', `"${encryptedInputPassword}"`);
        console.log('Stored encrypted password:', `"${data.password}"`);

        // Compare encrypted passwords
        if (encryptedInputPassword !== data.password) {
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
                .in('id', data.prospectus_ids)
                .eq('is_deleted', false);
                
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
                .select('id, client_name, phone, email')
                .in('id', Array.from(allProspectusIds))
                .eq('is_deleted', false);

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
                .in('id', data.prospectus_ids)
                .eq('is_deleted', false);
                
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
                .select('id, client_name, phone, email')
                .in('id', data.prospectus_ids)
                .eq('is_deleted', false);
                
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
                .eq('is_deleted', false)
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
                        .in('id', combinedIds)
                        .eq('is_deleted', false);
                        
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
                    .in('id', existingClient.prospectus_ids)
                    .eq('is_deleted', false);
                    
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
        // Leave password as-is - don't trim it to maintain consistency
        const encryptedPassword = encryptText(password || '');
        
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
                .select('id, client_name, phone, email')
                .in('id', prospectusIdsArray)
                .eq('is_deleted', false);
                
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
                    .in('id', prospectusIdsArray)
                    .eq('is_deleted', false);

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
            // Don't trim the password - let encryption handle it as-is
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
                .select('id, client_name, phone, email')
                .in('id', data.prospectus_ids)
                .eq('is_deleted', false);
                
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

/**
 * Get all prospectus details for a client based on their ID
 * 
 * This function:
 * 1. Fetches the client by ID to get their array of prospectus_ids
 * 2. Uses those IDs to retrieve the full details of each prospectus
 * 3. Returns all the prospectus data in the response
 * 
 * @param {object} req - Express request object
 * @param {object} req.params - Request parameters
 * @param {string} req.params.id - Client ID (UUID)
 * @param {object} res - Express response object
 * @returns {object} JSON response with prospectus data or error
 */
exports.getClientProspectus = async (req, res) => {
    console.log('Executing: getClientProspectus');
    const { id } = req.params;

    try {
        // Step 1: Fetch the client to get their prospectus_ids array
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('prospectus_ids')
            .eq('id', id)
            .single();

        if (clientError) {
            console.log('Error fetching client:', clientError);
            return res.status(400).json({
                success: false,
                error: clientError.message,
                timestamp: new Date().toISOString()
            });
        }

        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Client not found',
                timestamp: new Date().toISOString()
            });
        }

        // Step 2: Check if client has any prospectus IDs
        if (!client.prospectus_ids || client.prospectus_ids.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No prospectus records associated with this client',
                timestamp: new Date().toISOString()
            });
        }

        // Step 3: Fetch all prospectus data for the IDs in the array
        const { data: prospectusData, error: prospectusError } = await supabase
            .from('prospectus')
            .select(`
                *
            `)
            .in('id', client.prospectus_ids)
            .eq('is_deleted', false);

        if (prospectusError) {
            console.log('Error fetching prospectus data:', prospectusError);
            return res.status(400).json({
                success: false,
                error: prospectusError.message,
                timestamp: new Date().toISOString()
            });
        }

        // Step 4: Return the prospectus data
        res.status(200).json({
            success: true,
            data: prospectusData,
            count: prospectusData.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getClientProspectus:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Get pending prospectus details for a client based on their ID
 * 
 * This function:
 * 1. Fetches the client by ID to get their array of prospectus_ids
 * 2. Uses those IDs to retrieve only prospectus records where isregistered = 'pending'
 * 3. Returns the filtered prospectus data in the response
 * 
 * @param {object} req - Express request object
 * @param {object} req.params - Request parameters
 * @param {string} req.params.id - Client ID (UUID)
 * @param {object} res - Express response object
 * @returns {object} JSON response with pending prospectus data or error
 */
exports.getPendingClientRegistrations = async (req, res) => {
    console.log('Executing: getPendingClientRegistration');
    const { id } = req.params;

    try {
        // Step 1: Fetch the client to get their prospectus_ids array
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('prospectus_ids')
            .eq('id', id)
            .single();

        if (clientError) {
            console.log('Error fetching client:', clientError);
            return res.status(400).json({
                success: false,
                error: clientError.message,
                timestamp: new Date().toISOString()
            });
        }

        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Client not found',
                timestamp: new Date().toISOString()
            });
        }

        // Step 2: Check if client has any prospectus IDs
        if (!client.prospectus_ids || client.prospectus_ids.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No prospectus records associated with this client',
                timestamp: new Date().toISOString()
            });
        }

        // Step 3: Fetch pending prospectus data for the IDs in the array
        // with related prospectus data and bank account details
        const { data: registrationData, error: registrationError } = await supabase
            .from('registration')
            .select(`
                *,
                prospectus:prospectus_id(*),
                bank_accounts:bank_id(
                    id, 
                    account_name, 
                    account_holder_name, 
                    account_number, 
                    ifsc_code, 
                    account_type, 
                    bank, 
                    upi_id, 
                    branch
                )
            `)
            .in('prospectus_id', client.prospectus_ids)
            .eq('status', 'pending')
            .eq('is_deleted', false);

        if (registrationError) {
            console.log('Error fetching pending registration data:', registrationError);
            return res.status(400).json({
                success: false,
                error: registrationError.message,
                timestamp: new Date().toISOString()
            });
        }

        // Step 4: Return the pending prospectus data
        res.status(200).json({
            success: true,
            data: registrationData,
            count: registrationData.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getPendingClientRegistration:', error);
        console.error('Error stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

exports.getRegisteredClientRegistrations = async (req, res) => {
    console.log('Executing: getRegisteredClientRegistrations');
    const { id } = req.params;

    try {
        // Step 1: Fetch the client to get their prospectus_ids array
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('prospectus_ids')
            .eq('id', id)
            .single();

        if (clientError) {
            console.log('Error fetching client:', clientError);
            return res.status(400).json({
                success: false,
                error: clientError.message,
                timestamp: new Date().toISOString()
            });
        }

        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Client not found',
                timestamp: new Date().toISOString()
            });
        }

        // Step 2: Check if client has any prospectus IDs
        if (!client.prospectus_ids || client.prospectus_ids.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No prospectus records associated with this client',
                timestamp: new Date().toISOString()
            });
        }

        // Step 3: Fetch registrations data for the IDs in the array
        const { data: registrationData, error: registrationError } = await supabase
            .from('registration')
            .select(`
                *,
                prospectus:prospectus_id(*),
                bank_accounts:bank_id(
                    id, 
                    account_name, 
                    account_holder_name, 
                    account_number, 
                    ifsc_code, 
                    account_type, 
                    bank, 
                    upi_id, 
                    branch
                )
            `)
            .in('prospectus_id', client.prospectus_ids)
            .eq('status', 'registered')
            .eq('is_deleted', false);

        if (registrationError) {
            console.log('Error fetching pending registration data:', registrationError);
            return res.status(400).json({
                success: false,
                error: registrationError.message,
                timestamp: new Date().toISOString()
            });
        }

        // Step 4: Return the pending prospectus data
        res.status(200).json({
            success: true,
            data: registrationData,
            count: registrationData.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getPendingClientRegistration:', error);
        console.error('Error stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

exports.getClientQuotationReviewRegistration = async (req, res) => {
    console.log('Executing: getClientQuotationReviewRegistration');
    const { id } = req.params;

    try {
        // Step 1: Fetch the client to get their prospectus_ids array
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('prospectus_ids')
            .eq('id', id)
            .single();

        if (clientError) {
            console.log('Error fetching client:', clientError);
            return res.status(400).json({
                success: false,
                error: clientError.message,
                timestamp: new Date().toISOString()
            });
        }

        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Client not found',
                timestamp: new Date().toISOString()
            });
        }

        // Step 2: Check if client has any prospectus IDs
        if (!client.prospectus_ids || client.prospectus_ids.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No prospectus records associated with this client',
                timestamp: new Date().toISOString()
            });
        }

        // Step 3: Fetch quotation review data for the IDs in the array
        const { data: registrationData, error: registrationError } = await supabase
            .from('registration')
            .select(`
                *,
                prospectus:prospectus_id(*),
                bank_accounts:bank_id(
                    id, 
                    account_name, 
                    account_holder_name, 
                    account_number, 
                    ifsc_code, 
                    account_type, 
                    bank, 
                    upi_id, 
                    branch
                )
            `)
            .in('prospectus_id', client.prospectus_ids)
            .eq('status', 'quotation review')
            .eq('is_deleted', false);

        if (registrationError) {
            console.log('Error fetching pending registration data:', registrationError);
            return res.status(400).json({
                success: false,
                error: registrationError.message,
                timestamp: new Date().toISOString()
            });
        }

        // Step 4: Return the pending prospectus data
        res.status(200).json({
            success: true,
            data: registrationData,
            count: registrationData.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getPendingClientRegistration:', error);
        console.error('Error stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

exports.getClientRegistrations = async (req, res) => {
    console.log('Executing: getClientRegistrations');
    const { id } = req.params;

    try {
        // Step 1: Fetch the client to get their prospectus_ids array
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('prospectus_ids')
            .eq('id', id)
            .single();

        if (clientError) {
            console.log('Error fetching client:', clientError);
            return res.status(400).json({
                success: false,
                error: clientError.message,
                timestamp: new Date().toISOString()
            });
        }

        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Client not found',
                timestamp: new Date().toISOString()
            });
        }

        // Step 2: Check if client has any prospectus IDs
        if (!client.prospectus_ids || client.prospectus_ids.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No prospectus records associated with this client',
                timestamp: new Date().toISOString()
            });
        }

        // Step 3: Fetch all registration data for the IDs in the array
        const { data: registrationData, error: registrationError } = await supabase
            .from('registration')
            .select(`
                *,
                prospectus:prospectus_id(*),
                bank_accounts:bank_id(
                    id, 
                    account_name, 
                    account_holder_name, 
                    account_number, 
                    ifsc_code, 
                    account_type, 
                    bank, 
                    upi_id, 
                    branch
                ),
                transactions:transaction_id(*)
            `)
            .in('prospectus_id', client.prospectus_ids)
            .eq('is_deleted', false)
            .eq('transactions.is_deleted', false); // Only include non-deleted transactions

        if (registrationError) {
            console.log('Error fetching pending registration data:', registrationError);
            return res.status(400).json({
                success: false,
                error: registrationError.message,
                timestamp: new Date().toISOString()
            });
        }

        // Step 4: Return the pending prospectus data
        res.status(200).json({
            success: true,
            data: registrationData,
            count: registrationData.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getPendingClientRegistration:', error);
        console.error('Error stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

exports.submitClientPayment = async (req, res) => {
    console.log('Executing: submitClientPayment', req.body);
    
    uploadPaymentFiles(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer upload error:', err);
            // If the error is about field name, provide more helpful error message
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    success: false,
                    error: `File upload error: The form field "${err.field}" doesn't match the expected field name. Please use "files[]" for the file input field.`,
                    timestamp: new Date().toISOString()
                });
            }
            return res.status(400).json({
                success: false,
                error: `File upload error: ${err.message}`,
                timestamp: new Date().toISOString()
            });
        } else if (err) {
            console.error('General upload error:', err);
            return res.status(400).json({
                success: false,
                error: err.message,
                timestamp: new Date().toISOString()
            });
        }
        
        // After successful upload, process the payment data
        const { quotation_id, name, amount, notes, transaction_date, client_id } = req.body;
        
        if (!quotation_id || !name || !amount || !client_id) {
            console.log('Missing required fields:', { quotation_id, name, amount, client_id });
            return res.status(400).json({
                success: false,
                error: 'Registration ID, name, amount, and client ID are required',
                timestamp: new Date().toISOString()
            });
        }
        
        // Check if files are included in the request - files are mandatory
        if (!req.files || req.files.length === 0) {
            console.error('No files were provided in the request');
            return res.status(400).json({
                success: false,
                error: 'Payment proof files are required. Please upload at least one file.',
                timestamp: new Date().toISOString()
            });
        }

        try {
            // Verify the registration record exists
            const { data: registration, error: registrationError } = await supabase
                .from('registration')
                .select('id, prospectus_id')
                .eq('id', quotation_id)
                .single();

            if (registrationError) {
                console.error('Error fetching registration:', registrationError);
                return res.status(404).json({
                    success: false,
                    error: 'Error retrieving registration: ' + registrationError.message,
                    timestamp: new Date().toISOString()
                });
            }
            
            if (!registration) {
                console.log(`Registration with ID ${quotation_id} not found`);
                return res.status(404).json({
                    success: false,
                    error: 'Registration not found',
                    timestamp: new Date().toISOString()
                });
            }

            // Prepare payment record according to the quotations table schema
            const paymentData = {
                reg_id: parseInt(quotation_id),
                name,
                amount: parseFloat(amount),
                notes: notes || null,
                transaction_date: transaction_date || new Date().toISOString().split('T')[0],
                client_id: client_id,  // Using client_id as per schema
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                prospectus_id: registration.prospectus_id
            };
            
            // Upload files to Supabase storage
            let fileUrls = [];
            let fileUploadErrors = [];
            
            
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                console.log(`File ${i + 1} details:`, {
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    buffer: file.buffer ? 'Buffer exists' : 'No buffer found'
                });
                
                if (!file.buffer || file.size === 0) {
                    const errorMsg = `File ${i + 1} (${file.originalname}) has no data or empty buffer`;
                    console.error(errorMsg);
                    fileUploadErrors.push(errorMsg);
                    continue;
                }
                
                const fileExt = path.extname(file.originalname);
                const fileName = `${uuidv4()}${fileExt}`;
                const filePath = `reg_${quotation_id}/${fileName}`;
                
                try {
                    // Upload to Supabase storage in the quotation-files bucket
                    const { data: uploadData, error: uploadError } = await supabase
                        .storage
                        .from('quotation-files')
                        .upload(filePath, file.buffer, {
                            contentType: file.mimetype,
                            cacheControl: '3600'
                        });
                    
                    if (uploadError) {
                        const errorMsg = `Error uploading file ${file.originalname}: ${uploadError.message}`;
                        console.error(errorMsg);
                        fileUploadErrors.push(errorMsg);
                        continue;
                    }
                    
                    // Get public URL for the file
                    const { data: publicUrlData } = supabase
                        .storage
                        .from('quotation-files')
                        .getPublicUrl(filePath);
                    
                    fileUrls.push({
                        originalName: file.originalname,
                        storagePath: filePath,
                        url: publicUrlData.publicUrl,
                        size: file.size,
                        type: file.mimetype
                    });
                } catch (fileError) {
                    const errorMsg = `Error processing file ${file.originalname}: ${fileError.message}`;
                    console.error(errorMsg);
                    fileUploadErrors.push(errorMsg);
                }
            }
            
            // Check if any files were successfully uploaded
            if (fileUrls.length === 0) {
                console.error('Failed to upload any files:', fileUploadErrors);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to upload payment proof files. Please try again.',
                    details: fileUploadErrors,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Add file URLs to payment data
            paymentData.files = fileUrls;
            
            // If there were some errors but some files succeeded, add a warning
            let warningMessage = null;
            if (fileUploadErrors.length > 0) {
                warningMessage = `${fileUploadErrors.length} files failed to upload, but ${fileUrls.length} were successful.`;
                console.warn(warningMessage);
            }

            const { data: payment, error: paymentError } = await supabase
                .from('quotations')
                .insert([paymentData])
                .select()
                .single();

            if (paymentError) {
                console.error('Error saving payment to database:', paymentError);
                throw new Error(`Payment save failed: ${paymentError.message}`);
            }
            
            const { error: updateError } = await supabase
                .from('registration')
                .update({ 
                    status: 'quotation accepted',
                    updated_at: new Date().toISOString()
                })
                .eq('id', quotation_id);

            if (updateError) {
                console.error('Error updating registration status:', updateError);
                // Don't throw here - we already saved the payment, just log the error
                console.warn('Payment was saved but registration status update failed');
            }
            
            // Return success response with payment data and any warnings
            res.status(201).json({
                success: true,
                data: payment,
                message: 'Payment submitted successfully. Registration is waiting for approval.',
                warning: warningMessage,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error processing payment:', error);
            console.error('Error stack trace:', error.stack);
            res.status(500).json({
                success: false,
                error: `An error occurred while processing the payment: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
    });
};

/**
 * Get registration and quotation data for a specific prospectus
 * 
 * This function:
 * 1. Fetches registration records associated with the registration ID
 * 2. Fetches related quotation payment records for the registration
 * 3. Fetches prospectus data using prospectus_id from registration
 * 4. Fetches leads data including requirement field using prospectus_id
 * 5. Fetches transaction details if registration has transaction_id
 * 6. Fetches entity details for the registered_by field
 * 7. Returns combined data with all related information
 * 
 * @param {object} req - Express request object
 * @param {object} req.params - Request parameters
 * @param {string} req.params.regId - Registration ID
 * @param {object} res - Express response object
 * @returns {object} JSON response with registration, payment, prospectus, leads, and transaction data
 */
exports.getProspectusRegistrationData = async (req, res) => {
    console.log('Executing: getProspectusRegistrationData');
    const { regId } = req.params;
    
    if (!regId) {
        return res.status(400).json({
            success: false,
            error: 'Registration ID is required',
            timestamp: new Date().toISOString()
        });
    }
    
    try {
        // Fetch all registration records for this registration ID
        const { data: registrations, error: registrationError } = await supabase
            .from('registration')
            .select(`
                *,
                bank_details:bank_id(
                    id, 
                    account_name, 
                    account_holder_name, 
                    account_number, 
                    ifsc_code, 
                    account_type, 
                    bank, 
                    upi_id, 
                    branch
                ),
                registered_by_entity:registered_by(
                    id,
                    username,
                    email
                )
            `)
            .eq('id', regId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });
            
        if (registrationError) {
            console.error('Error fetching registrations:', registrationError);
            return res.status(400).json({
                success: false,
                error: 'Error retrieving registration data: ' + registrationError.message,
                timestamp: new Date().toISOString()
            });
        }
        
        // If no registrations found, return an error response
        if (!registrations || registrations.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No registration records found with this ID',
                timestamp: new Date().toISOString()
            });
        }

        // Extract the prospectus_id from the registration data
        const prospectusId = registrations[0].prospectus_id;
        
        // Fetch the prospectus data
        const { data: prospectusData, error: prospectusError } = await supabase
            .from('prospectus')
            .select('*')
            .eq('id', prospectusId)
            .eq('is_deleted', false)
            .single();
            
        if (prospectusError) {
            console.error('Error fetching prospectus data:', prospectusError);
            // Continue with other data even if prospectus fetch fails
        }
        
        // Fetch leads data using prospectus_id to get leads.requirement
        const { data: leadsData, error: leadsError } = await supabase
            .from('leads')
            .select('id, requirement')
            .eq('id', prospectusData?.leads_id)
            .single();
            
        if (leadsError) {
            console.error('Error fetching leads data:', leadsError);
        }
        
        // Fetch all quotation records for this registration
        const { data: quotations, error: quotationError } = await supabase
            .from('quotations')
            .select(`
                *,
                client:client_id(id, email)
            `)
            .eq('reg_id', regId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });
            
        if (quotationError) {
            console.error('Error fetching quotations:', quotationError);
            console.warn('Continuing with registration data only');
        }
        
        // Fetch transaction data if transaction_id exists in registration
        let transactionData = null;
        if (registrations[0] && registrations[0].transaction_id) {
            const { data: transaction, error: transactionError } = await supabase
                .from('transactions')
                .select(`
                    *,
                    entity:entity_id(
                        id,
                        username,
                        email
                    )
                `)
                .eq('id', registrations[0].transaction_id)
                .eq('is_deleted', false) // Only include non-deleted transactions
                .single();
                
            if (transactionError) {
                console.error('Error fetching transaction data:', transactionError);
                // Continue with other data even if transaction fetch fails
            } else {
                transactionData = transaction;
            }
        }
        
        // Return the complete data including leads and transaction information
        res.status(200).json({
            success: true,
            data: {
                registrations: registrations,
                quotations: quotations || [],
                prospectus: prospectusData || null,
                leads: leadsData || null,
                transaction: transactionData || null
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getProspectusRegistrationData:', error);
        console.error('Error stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Get all registration and quotation data for a client
 * 
 * This function:
 * 1. Fetches the client to get their array of prospectus_ids
 * 2. For each prospectus, fetches registration and quotation data
 * 3. Returns comprehensive data organized by prospectus
 * 
 * @param {object} req - Express request object
 * @param {object} req.params - Request parameters
 * @param {string} req.params.clientId - Client ID (UUID)
 * @param {object} res - Express response object
 * @returns {object} JSON response with client's registration and payment data
 */
exports.getClientRegistrationHistory = async (req, res) => {
    console.log('Executing: getClientRegistrationHistory');
    const { clientId } = req.params;
    
    if (!clientId) {
        return res.status(400).json({
            success: false,
            error: 'Client ID is required',
            timestamp: new Date().toISOString()
        });
    }
    
    try {
        // Fetch the client to get their prospectus_ids array
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('id, email, prospectus_ids')
            .eq('id', clientId)
            .single();
            
        if (clientError) {
            console.error('Error fetching client:', clientError);
            return res.status(404).json({
                success: false,
                error: 'Error retrieving client: ' + clientError.message,
                timestamp: new Date().toISOString()
            });
        }
        
        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Client not found',
                timestamp: new Date().toISOString()
            });
        }
        
        // Check if client has any prospectus IDs
        if (!client.prospectus_ids || client.prospectus_ids.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    client: { id: client.id, email: client.email },
                    prospectusData: []
                },
                message: 'No prospectus records associated with this client',
                timestamp: new Date().toISOString()
            });
        }
        
        // Fetch all prospectus data for this client
        const { data: prospectusData, error: prospectusError } = await supabase
            .from('prospectus')
            .select('*')
            .in('id', client.prospectus_ids)
            .eq('is_deleted', false);
            
        if (prospectusError) {
            console.error('Error fetching prospectus data:', prospectusError);
            return res.status(400).json({
                success: false,
                error: 'Error retrieving prospectus data: ' + prospectusError.message,
                timestamp: new Date().toISOString()
            });
        }
        
        // For each prospectus, fetch registrations and quotations
        const prospectusDetails = await Promise.all(prospectusData.map(async (prospectus) => {
            // Fetch registrations for this prospectus with bank details
            const { data: registrations, error: regError } = await supabase
                .from('registration')
                .select(`
                    *,
                    assigned_to_entity:assigned_to(id, name, email),
                    registered_by_entity:registered_by(id, name, email),
                    bank_details:bank_id(
                        id, 
                        account_name, 
                        account_holder_name, 
                        account_number, 
                        ifsc_code, 
                        account_type, 
                        bank, 
                        upi_id, 
                        branch
                    )
                `)
                .eq('prospectus_id', prospectus.id)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });
                
            if (regError) {
                console.error(`Error fetching registrations for prospectus ${prospectus.id}:`, regError);
                return {
                    prospectus,
                    registrations: [],
                    quotations: []
                };
            }
            
            // Get registration IDs to fetch quotations
            const registrationIds = registrations ? registrations.map(reg => reg.id) : [];
            
            // Fetch quotations for this prospectus
            const { data: quotations, error: quoteError } = await supabase
                .from('quotations')
                .select('*')
                .eq('prospectus_id', prospectus.id)
                .eq('is_deleted', false)
                .in('reg_id', registrationIds.length > 0 ? registrationIds : [0])  // Use [0] to ensure query works with empty array
                .order('created_at', { ascending: false });
                
            if (quoteError) {
                console.error(`Error fetching quotations for prospectus ${prospectus.id}:`, quoteError);
                return {
                    prospectus,
                    registrations: registrations || [],
                    quotations: []
                };
            }
            
            // Organize data by adding quotations to their respective registrations
            const enhancedRegistrations = registrations ? registrations.map(registration => {
                // Find all quotations for this registration
                const matchingQuotations = quotations ? 
                    quotations.filter(q => q.reg_id === registration.id) : [];
                    
                return {
                    ...registration,
                    quotations: matchingQuotations || []
                };
            }) : [];
            
            return {
                prospectus,
                registrations: enhancedRegistrations,
                quotations: quotations || []
            };
        }));
        
        // Return the comprehensive data
        res.status(200).json({
            success: true,
            data: {
                client: { id: client.id, email: client.email },
                prospectusData: prospectusDetails
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getClientRegistrationHistory:', error);
        console.error('Error stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Get combined data from registration, quotations, journal_data, and transactions tables
 * 
 * This function:
 * 1. Fetches registration data by reg_id
 * 2. Uses the prospectus_id from registration to fetch related journal_data
 * 3. Fetches quotation data by reg_id
 * 4. Fetches transaction data using transaction_id from registration
 * 5. Returns combined data from all tables without client information
 * 
 * @param {object} req - Express request object
 * @param {object} req.body - Request body
 * @param {number} req.body.reg_id - Registration ID
 * @param {object} res - Express response object
 * @returns {object} JSON response with combined data
 */
exports.getCombinedRegistrationData = async (req, res) => {
    console.log('Executing: getCombinedRegistrationData');
    const { reg_id } = req.body;

    if (!reg_id) {
        return res.status(400).json({
            success: false,
            error: 'Registration ID is required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // Step 1: Fetch registration data
        const { data: registrationData, error: registrationError } = await supabase
            .from('registration')
            .select(`
                *,
                prospectus:prospectus_id(*),
                bank_details:bank_id(
                    id, 
                    account_name, 
                    account_holder_name, 
                    account_number, 
                    ifsc_code, 
                    account_type, 
                    bank, 
                    upi_id, 
                    branch
                ),
                assigned_to_entity:assigned_to(
                    id,
                    username,
                    email
                ),
                registered_by_entity:registered_by(
                    id,
                    username,
                    email
                )
            `)
            .eq('id', reg_id)
            .eq('is_deleted', false)
            .single();

        if (registrationError) {
            console.error('Error fetching registration data:', registrationError);
            return res.status(400).json({
                success: false,
                error: 'Error retrieving registration data: ' + registrationError.message,
                timestamp: new Date().toISOString()
            });
        }

        if (!registrationData) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found',
                timestamp: new Date().toISOString()
            });
        }

        // Step 2: Fetch quotation data using reg_id (without client information)
        const { data: quotationData, error: quotationError } = await supabase
            .from('quotations')
            .select('id, reg_id, name, amount, notes, transaction_date, files, prospectus_id, created_at, updated_at')
            .eq('reg_id', reg_id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (quotationError) {
            console.error('Error fetching quotation data:', quotationError);
            // Continue with other data even if quotations fetch fails
        }

        // Step 3: Fetch journal data using prospectus_id from registration
        const prospectusId = registrationData.prospectus_id;
        const { data: journalData, error: journalError } = await supabase
            .from('journal_data')
            .select(`
                *,
                assigned_entity:assigned_to(
                    id,
                    username,
                    email
                )
            `)
            .eq('prospectus_id', prospectusId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (journalError) {
            console.error('Error fetching journal data:', journalError);
            // Continue with other data even if journal fetch fails
        }

        // Step 4: Fetch transaction data if transaction_id exists in registration
        let transactionData = null;
        if (registrationData.transaction_id) {
            const { data: transaction, error: transactionError } = await supabase
                .from('transactions')
                .select(`
                    *,
                    entity:entity_id(
                        id,
                        username,
                        email
                    )
                `)
                .eq('id', registrationData.transaction_id)
                .eq('is_deleted', false) // Only include non-deleted transactions
                .single();

            if (transactionError) {
                console.error('Error fetching transaction data:', transactionError);
                // Continue with other data even if transaction fetch fails
            } else {
                transactionData = transaction;
            }
        }

        // Remove client_id from registration data if it exists
        if (registrationData && registrationData.client_id) {
            delete registrationData.client_id;
        }

        // Step 5: Return combined data (without client information)
        res.status(200).json({
            success: true,
            data: {
                registration: registrationData,
                quotations: quotationData || [],
                journalData: journalData || [],
                transaction: transactionData || []
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getCombinedRegistrationData:', error);
        console.error('Error stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
};
