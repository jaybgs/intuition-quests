# Admin/Oracle Access Setup

This document explains how to access the admin/oracle role for site management.

## Current Credentials

**⚠️ IMPORTANT: Change these credentials before going to production!**

### Admin Account
- **Username:** `admin`
- **Password:** `admin` (default - **MUST BE CHANGED**)

### Oracle Account
- **Username:** `oracle`
- **Password:** `admin` (default - **TEMPORARY, MUST BE CHANGED**)
  - Note: Currently uses the same password as admin for testing. Change this immediately in production.

## How to Access Admin Panel (Hidden Method)

**The admin login is completely hidden from regular users.** To access:

1. **Press `Ctrl+Shift+A` (Windows/Linux) or `Cmd+Shift+A` (Mac)** anywhere on the site
2. The admin login modal will appear
3. Enter your admin username and password
4. You will see a subtle admin badge in the top-right corner (only visible when logged in)
5. You can now access the site and make changes even without a wallet connection

**Why Hidden?**
- Regular users should not be aware that admin functionality exists
- The keyboard shortcut provides secure, invisible access
- No visible "Admin" button is shown to non-admin users

## How to Change Admin Credentials

To change the admin credentials, edit `frontend/src/services/adminAuthService.ts`:

1. Generate a SHA-256 hash of your new password:
   - You can use an online tool like https://emn178.github.io/online-tools/sha256.html
   - Or use Node.js: `require('crypto').createHash('sha256').update('your-password').digest('hex')`

2. Update the `ADMIN_CREDENTIALS` array in `adminAuthService.ts`:
   ```typescript
   const ADMIN_CREDENTIALS = [
     {
       username: 'admin',
       passwordHash: 'YOUR_NEW_HASH_HERE', // Replace with your new password hash
       role: 'admin'
     },
     {
       username: 'oracle',
       passwordHash: 'YOUR_NEW_HASH_HERE', // Replace with your new password hash
       role: 'oracle'
     }
   ];
   ```

## Admin Features

### General Features
- **Full Site Access:** Admin can access all features without wallet connection
- **Session Duration:** Admin sessions last 7 days
- **Logout:** 
  - **Method 1:** Press `Ctrl+Shift+A` (or `Cmd+Shift+A` on Mac) while logged in to logout
  - **Method 2:** Click the "Logout" button on the admin badge in the top-right corner

### Builder Profile Access (Admin Only)
- **Search by Slug:** When logged in as admin, search for any space/builder by their slug in the search bar
- **Builder Access Button:** Each search result will show a "Builder Access" button (admin-only)
- **Direct Access:** Click the button to directly access that builder's dashboard/profile
- This allows admins to manage and view any creator's builder profile

## Security Notes

- Admin credentials are stored as SHA-256 hashes in the frontend code
- For production, consider moving admin authentication to a backend service
- Admin sessions are stored in localStorage and expire after 7 days
- Always use strong, unique passwords for admin accounts
- The admin login is completely hidden from regular users (no visible UI elements)
- Keyboard shortcut (`Ctrl+Shift+A` / `Cmd+Shift+A`) is the only way to access admin login

## Troubleshooting

- If you can't login, verify the password hash is correct
- Clear browser localStorage if session issues occur
- Check browser console for authentication errors
- Make sure you're pressing the correct keyboard shortcut (`Ctrl+Shift+A` or `Cmd+Shift+A`)
