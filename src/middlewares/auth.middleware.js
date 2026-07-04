// const jwt = require('jsonwebtoken');
// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient();

// const protect = async (req, res, next) => {
//   try {
//     // Header theke token naw
//     const authHeader = req.headers.authorization;
//     console.log('authHeader:============', authHeader)

//     if (!authHeader || !authHeader.startsWith('Bearer')) {
//       return res.status(401).json({ message: 'No token, unauthorized' });
//     }

//     const token = authHeader.split(' ')[1]; // "Bearer <token>" theke token part

//     // Token verify 
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // User database theke ana
//     const user = await prisma.user.findUnique({
//       where: { id: decoded.id },
//       select: { id: true, name: true, email: true }, // password bad daw
//     });

//     if (!user) {
//       return res.status(401).json({ message: 'User not found' });
//     }

//     req.user = user; // pore handler a patan
//     next(); // pore middleware/controller a jabe
//   } catch (error) {
//     res.status(401).json({ message: 'Token invalid or expired' });
//   }
// };

// module.exports = protect;

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const protect = async (req, res, next) => {
  try {

    // take token from header 
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return res.status(401).json({ message: 'No Token, Unatuthorized' });
    }

    // bring token from Bearer <token> 
    const token = authHeader.split(' ')[1];

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // bring user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true }, // without password
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user; // send to next handler

    next(); // go to next middleware/controller

  } catch (error) {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
}

module.exports = protect;