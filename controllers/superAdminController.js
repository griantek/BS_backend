const supabase = require('../supabaseClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const generateToken = (admin) => {
    return jwt.sign(
        { id: admin.id, username: admin.username, role: 'superadmin' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

exports.loginSuperAdmin = async (req, res) => {
    const { username, password } = req.body;

    const { data: admin, error } = await supabase
        .from('supAdmin')
        .select('*')
        .eq('username', username)
        .single();

    if (error || !admin) {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }

    const token = generateToken(admin);
    const { password: _, ...adminWithoutPassword } = admin;

    res.status(200).json({
        success: true,
        token,
        admin: adminWithoutPassword
    });
};

exports.createSuperAdmin = async (req, res) => {
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
};

exports.getAllServices = async (req, res) => {
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
};
