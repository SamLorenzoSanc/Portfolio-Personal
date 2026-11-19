require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

const createAdmin = async () => {
  try {

    await connectDB();

    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (adminExists) {
      console.log('El usuario administrador ya existe.');
      process.exit(0);
    }

    console.log('El email es: ', process.env.ADMIN_EMAIL, " y la contraseña: ", process.env.ADMIN_PASSWORD);
    
    await User.create({
      name: 'Samuel Lorenzo',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });

    console.log('Usuario administrador creado correctamente.');
    process.exit(0);
  } catch (error) {
    console.error(`Error creando administrador: ${error.message}`);
    process.exit(1);
  }
};

createAdmin();