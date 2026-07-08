// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient();

// passport.use(
//     new GoogleStrategy(
//         {
//             clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
//             clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
//             callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
//         },
//         async (accessToken, refreshToken, profile, done) => {
//             try {
//                 const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
//                 if (!email) {
//                     return done(new Error('No email found in Google profile'), false);
//                 }

//                 // Check if user already exists
//                 let user = await prisma.user.findUnique({
//                     where: { email },
//                 });

//                 if (user) {
//                     // Update googleId if not present
//                     if (!user.googleId) {
//                         user = await prisma.user.update({
//                             where: { email },
//                             data: {
//                                 googleId: profile.id,
//                                 isVerified: true, // Google accounts are implicitly verified
//                             },
//                         });
//                     }
//                     return done(null, user);
//                 } else {
//                     // Create new user
//                     user = await prisma.user.create({
//                         data: {
//                             name: profile.displayName || 'Google User',
//                             email: email,
//                             googleId: profile.id,
//                             isVerified: true,
//                         },
//                     });
//                     return done(null, user);
//                 }
//             } catch (error) {
//                 return done(error, false);
//             }
//         }
//     )
// );

// module.exports = passport;
