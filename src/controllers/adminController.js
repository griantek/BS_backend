const supabase = require('../utils/supabaseClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const generateToken = (admin) => {
    return jwt.sign(
        { id: admin.id, username: admin.username, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

exports.loginAdmin = async (req, res) => {
    console.log("Executing: loginAdmin");
    try {
        const { username, password } = req.body;

        const { data: admin, error } = await supabase
            .from('supAdmin')
            .select(`
                *,
                role_details:role(
                    id,
                    name,
                    description,
                    permissions,
                    entity_type
                )
            `)
            .eq('username', username)
            .single();

        if (error || !admin) {
            return res.status(401).json({
                success: false,
                error: 'Username not found'
            });
        }

        // When password doesn't match
        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Incorrect password'
            });
        }

        // Get permissions details
        let permissionDetails = [];
        if (admin.role_details?.permissions) {
            const permissionIds = admin.role_details.permissions;
            const { data: permissions, error: permError } = await supabase
                .from('permissions')
                .select('id, name, description')
                .in('id', permissionIds);

            if (!permError) {
                permissionDetails = permissions;
            }
        }

        const token = generateToken(admin);
        const { password: _, ...adminWithoutPassword } = admin;

        // Format the response
        const response = {
            success: true,
            token,
            admin: {
                ...adminWithoutPassword,
                role: {
                    id: admin.role_details?.id,
                    name: admin.role_details?.name || 'SupAdmin',
                    permissions: permissionDetails.map(p => ({
                        id: p.id,
                        name: p.name,
                        description: p.description
                      })),
                    entity_type: admin.role_details?.entity_type
                },
            }
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error in loginAdmin:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred'
        });
    }
};

exports.createAdmin = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Username and password are required'
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(
            password,
            parseInt(process.env.BCRYPT_SALT_ROUNDS)
        );

        const { data, error } = await supabase
            .from('supAdmin')
            .insert([{ username, password: hashedPassword }])
            .select();

        if (error) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        const { password: _, ...adminWithoutPassword } = data[0];

        res.status(201).json({
            success: true,
            message: 'Super Admin created successfully',
            admin: adminWithoutPassword
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Added service-related functions
exports.createService = async (req, res) => {
    try {
        console.log('Create service');
        const {
            service_name,
            service_type,
            description,
            fee,
            min_duration,
            max_duration
        } = req.body;

        if (!service_name || !fee) {
            console.log('Service creation failed: Service name and fee are required');
            return res.status(400).json({
                success: false,
                error: 'Service name and fee are required',
                timestamp: new Date().toISOString()
            });
        }

        const { data, error } = await supabase
            .from('services')
            .insert([{
                service_name,
                service_type,
                description,
                fee,
                min_duration,
                max_duration
            }])
            .select();

        if (error) {
            console.log(`Service creation failed: ${error.message}`);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        console.log('Service created successfully');
        res.status(201).json({
            success: true,
            message: "Service created successfully",
            data: data[0],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in createService:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

exports.getAllServices = async (req, res) => {
    try {
        console.log('Get all services');
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .order('id', { ascending: true });

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
        console.error('Error in getAllServices:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred'
        });
    }
};

//====================================
// Role Management Controllers
//====================================

exports.getAllRoles = async (req, res) => {
    try {
        console.log('Executing: getAllRoles');

        // Get all roles with their permission IDs
        const { data: roles, error: roleError } = await supabase
            .from('roles')
            .select('*')
            .order('created_at', { ascending: false });

        if (roleError) {
            console.log('Error fetching roles:', roleError);
            return res.status(400).json({
                success: false,
                error: roleError.message,
                timestamp: new Date().toISOString()
            });
        }

        // Get all unique permission IDs from all roles
        const allPermissionIds = Array.from(new Set(
            roles.reduce((acc, role) => {
                return acc.concat(role.permissions || []);
            }, [])
        ));

        // Fetch all permissions in a single query if there are any IDs
        let permissionsMap = {};
        if (allPermissionIds.length > 0) {
            const { data: permissions, error: permError } = await supabase
                .from('permissions')
                .select('*')
                .in('id', allPermissionIds);

            if (permError) {
                console.log('Error fetching permissions:', permError);
                return res.status(400).json({
                    success: false,
                    error: permError.message,
                    timestamp: new Date().toISOString()
                });
            }

            // Create a map of permission id to permission details
            permissionsMap = permissions.reduce((acc, perm) => {
                acc[perm.id] = perm;
                return acc;
            }, {});
        }

        // Map the permissions to each role
        const rolesWithPermissions = roles.map(role => ({
            ...role,
            permissions: (role.permissions || []).map(permId => ({
                id: permId,
                name: permissionsMap[permId]?.name,
                description: permissionsMap[permId]?.description,
                entity_type: permissionsMap[permId]?.entity_type
            }))
        }));

        res.status(200).json({
            success: true,
            data: rolesWithPermissions,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getAllRoles:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred'
        });
    }
};

exports.getRoleById = async (req, res) => {
    try {
        console.log('Executing: getRoleById');
        const { id } = req.params;

        const { data, error } = await supabase
            .from('roles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.log('Error fetching role:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Role not found',
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getRoleById:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred'
        });
    }
};

exports.createRole = async (req, res) => {
    try {
        console.log('Executing: createRole');
        const { name, description, permissions, entity_type } = req.body;

        // Validate required fields
        if (!name || typeof name !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Role name is required and must be a string',
                timestamp: new Date().toISOString()
            });
        }

        // Validate permissions format if provided
        if (permissions && !Array.isArray(permissions)) {
            return res.status(400).json({
                success: false,
                error: 'Permissions must be an array of IDs',
                timestamp: new Date().toISOString()
            });
        }

        const { data, error } = await supabase
            .from('roles')
            .insert([{
                name,
                description,
                permissions,
                entity_type,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            // Handle unique constraint violation
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    error: 'Role name already exists',
                    timestamp: new Date().toISOString()
                });
            }

            console.log('Error creating role:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        res.status(201).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in createRole:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred'
        });
    }
};

exports.updateRole = async (req, res) => {
    try {
        console.log('Executing: updateRole');
        const { id } = req.params;
        const { name, description, permissions, entity_type } = req.body;

        // Explicitly setting new permissions array, overwriting old one
        const { data, error } = await supabase
            .from('roles')
            .update({
                name,
                description,
                permissions: permissions || [], // If permissions is null/undefined, use empty array
                entity_type,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.log('Error updating role:', error);
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
        console.error('Error in updateRole:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred'
        });
    }
};

exports.deleteRole = async (req, res) => {
    try {
        console.log('Executing: deleteRole');
        const { id } = req.params;

        const { error } = await supabase
            .from('roles')
            .delete()
            .eq('id', id);

        if (error) {
            console.log('Error deleting role:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            message: 'Role deleted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in deleteRole:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred'
        });
    }
};

exports.getRoleWithPermissions = async (req, res) => {
    try {
        console.log('Executing: getRoleWithPermissions');
        const { id } = req.params;

        // First get the role
        const { data: role, error: roleError } = await supabase
            .from('roles')
            .select('*')
            .eq('id', id)
            .single();

        if (roleError) {
            console.log('Error fetching role:', roleError);
            return res.status(400).json({
                success: false,
                error: roleError.message,
                timestamp: new Date().toISOString()
            });
        }

        if (!role) {
            return res.status(404).json({
                success: false,
                error: 'Role not found',
                timestamp: new Date().toISOString()
            });
        }

        // Then get all permissions for this role
        let permissionDetails = [];
        if (role.permissions && role.permissions.length > 0) {
            const { data: permissions, error: permError } = await supabase
                .from('permissions')
                .select('*')
                .in('id', role.permissions);

            if (permError) {
                console.log('Error fetching permissions:', permError);
                return res.status(400).json({
                    success: false,
                    error: permError.message,
                    timestamp: new Date().toISOString()
                });
            }

            permissionDetails = permissions;
        }

        // Format the response
        const response = {
            ...role,
            permissions: permissionDetails.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                entity_type: p.entity_type,
                created_at: p.created_at,
                updated_at: p.updated_at
            }))
        };

        res.status(200).json({
            success: true,
            data: response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

//====================================
// Permission Controllers
//====================================

exports.getAllPermissions = async (req, res) => {
    try {
        console.log('Executing: getAllPermissions');

        const { data, error } = await supabase
            .from('permissions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.log('Error fetching permissions:', error);
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
        console.error('Error in getAllPermissions:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred'
        });
    }
};

exports.getPermissionsByEntityType = async (req, res) => {
    try {
        console.log('Executing: getPermissionsByEntityType');
        const { entity_type } = req.params;

        const { data, error } = await supabase
            .from('permissions')
            .select('*')
            .eq('entity_type', entity_type)
            .order('created_at', { ascending: false });
        if (error) {
            console.log('Error fetching permissions:', error);
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
        console.error('Error in getPermissionsByEntityType:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};
