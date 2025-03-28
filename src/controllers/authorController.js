const supabase = require('../utils/supabaseClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { decryptText, encryptText } = require('../utils/encryption');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Use memory storage for temporary file handling
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        // Accept papers in common document formats
        const allowedFileTypes = ['.pdf', '.doc', '.docx', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedFileTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
        }
    }
}).single('paper_file');

exports.getAssignedRegistrations = async (req, res) => {
    console.log('Executing: getAssignedRegistrations');
    const { executive_id } = req.params;

    try {
        // Get registrations with joined prospectus data in a single query
        const { data: registrations, error: registrationError } = await supabase
            .from('registration')
            .select(`
                *,
                prospectus:prospectus_id(
                    id, 
                    client_name, 
                    reg_id, 
                    requirement, 
                    email,
                    phone,
                    department,
                    state,
                    tech_person,
                    entity:entity_id (
                        id,
                        username,
                        email
                    )
                )
            `)
            .eq('assigned_to', executive_id)
            .eq('status', 'registered')
            .eq('journal_added', false);
            
        if (registrationError) throw registrationError;
        
        if (!registrations || registrations.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                timestamp: new Date().toISOString()
            });
        }
        
        // The data is already in the format we need from the joined query
        res.status(200).json({
            success: true,
            data: registrations,
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

exports.updateAuthorStatus = async (req, res) => {
    console.log('Executing: updateAuthorStatus');
    const { regId } = req.params;
    const { status,comments } = req.body;
    
    if (!status) {
        return res.status(400).json({
            success: false,
            error: 'Status is required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        const { data, error } = await supabase
            .from('registration')
            .update({ author_status: status, updated_at: new Date() })
            .eq('prospectus_id', regId)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found',
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data: data[0],
            message: 'Author status updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating author status:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.uploadPaper = async (req, res) => {
    console.log('Executing: uploadPaper');
    
    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                error: `File upload error: ${err.message}`,
                timestamp: new Date().toISOString()
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                error: err.message,
                timestamp: new Date().toISOString()
            });
        }
        
        // After successful upload, process the request
        const { status, comments, reg_id } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required',
                timestamp: new Date().toISOString()
            });
        }

        if (!reg_id) {
            return res.status(400).json({
                success: false,
                error: 'Registration ID is required',
                timestamp: new Date().toISOString()
            });
        }

        try {
            // Check if the registration exists first
            const { data: existingReg, error: checkError } = await supabase
                .from('registration')
                .select('id, author_status')
                .eq('prospectus_id', reg_id)
                .single();

            if (checkError) throw checkError;
            
            if (!existingReg) {
                return res.status(404).json({
                    success: false,
                    error: 'Registration not found',
                    timestamp: new Date().toISOString()
                });
            }

            // Prepare update data
            const updateData = { 
                author_status: status, 
                updated_at: new Date()
            };
            
            // Add comments if provided
            if (comments) {
                updateData.author_comments = comments;
            }
            
            // Upload file to Supabase if provided
            let fileUrl = null;
            if (req.file) {
                const fileExt = path.extname(req.file.originalname);
                const fileName = `${uuidv4()}${fileExt}`;
                const filePath = `papers/${reg_id}/${fileName}`;
                
                // Upload to Supabase storage
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('author-papers')
                    .upload(filePath, req.file.buffer, {
                        contentType: req.file.mimetype,
                        cacheControl: '3600'
                    });
                
                if (uploadError) throw uploadError;
                
                // Get public URL for the file
                const { data: publicUrlData } = supabase
                    .storage
                    .from('author-papers')
                    .getPublicUrl(filePath);
                
                fileUrl = publicUrlData.publicUrl;
                
                // Store file URL in file_path field (matches the database schema)
                updateData.file_path = fileUrl;
                
                // Also mention the file name in the comments for reference
                const fileComment = `File uploaded: ${req.file.originalname}`;
                updateData.author_comments = comments 
                    ? `${comments}\n\n${fileComment}` 
                    : fileComment;
            }
            
            // Update the registration in the database
            const { data, error } = await supabase
                .from('registration')
                .update(updateData)
                .eq('prospectus_id', reg_id)
                .select();

            if (error) throw error;

            // File already uploaded at this point, so return success
            res.status(200).json({
                success: true,
                data: data[0],
                message: 'Paper uploaded and author status updated successfully',
                file_url: fileUrl,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error uploading paper:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
};