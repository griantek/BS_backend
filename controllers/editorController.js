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

// Add other editor-specific functions here...
