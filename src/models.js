// FleetDVIR Data Models
// Firestore collections and field definitions
// Location: nam5 (United States), Standard edition, production mode

// ============================================================
// COLLECTION: drivers
// Drivers self-create profiles. Selfie uploaded for visual
// verification before admin (Larry) issues badge manually.
// Sign-in is email/password via Firebase Auth only.
// ============================================================
export const Driver = {
  firstName: '',        // string, required
  lastName: '',         // string, required
  selfieUrl: '',        // string (Firebase Storage URL), required before DVIR submission
  badgeStatus: 'pending', // 'pending' | 'approved' | 'denied'
  role: 'driver',       // 'driver' | 'supervisor' | 'shop' | 'admin' (Larry only)
  createdAt: null,      // timestamp
  updatedAt: null,      // timestamp
}

// Badge rules:
// - Profiles without a badge cannot view DVIRs, use chat, or access anything else.
// - Only the landing page is publicly viewable; everything else requires sign-in.
// - Admin is Larry only.

// ============================================================
// COLLECTION: dvirs
// Every DVIR starts at Riverside Distribution Center in Riverside.
// ============================================================
export const DVIR = {
  driverId: '',              // string, reference to drivers collection
  driverName: '',            // string, denormalized for quick display
  dateTime: null,            // timestamp
  location: 'Riverside Distribution Center', // fixed starting point
  tractorNumber: '',         // string, required (no license plate)
  trailerNumber: '',         // string, required (no license plate)
  odometer: 0,               // number
  defectChecklist: {         // DOT-required defect checklist
    brakes: false,
    lights: false,
    tires: false,
    steering: false,
    coupling: false,
    suspension: false,
    fuelSystem: false,
    exhaust: false,
    mirrors: false,
    wipers: false,
    horn: false,
    emergencyEquipment: false,
    other: false,
  },
  status: 'no_defects',      // 'no_defects' (green) | 'defects_found' (red)
  // Two color-coded buttons, NOT a dropdown.
  // Tapping red 'defects found' opens the camera to take a photo.
  unsafeFlag: null,          // null | 'safe_to_drive' | 'unsafe_to_drive' (digital out-of-service)
  driverSignatureUrl: '',    // string (Firebase Storage URL)
  bodyDamagePhotos: [],      // array of photo URLs, as many as needed
  createdAt: null,           // timestamp
  retentionExpiresAt: null,  // timestamp, 90 days from createdAt (FMCSA 49 CFR 396.11 minimum)
}

// ============================================================
// COLLECTION: defects
// When a defect is found, it gets routed to the shop role.
// Driver is NOT notified of resolution. It stays tied to the
// equipment record so the next driver sees it was signed off.
// ============================================================
export const Defect = {
  dvirId: '',              // string, reference to dvirs collection
  tractorNumber: '',       // string, denormalized for equipment lookup
  trailerNumber: '',       // string, denormalized for equipment lookup
  defectType: '',          // string, e.g. 'brakes', 'tires'
  photoUrl: '',            // string (Firebase Storage URL)
  status: 'open',          // 'open' | 'resolved'
  resolvedBy: '',          // string, mechanic's driver ID
  resolvedByName: '',      // string, denormalized mechanic name
  resolvedAt: null,        // timestamp
  createdAt: null,         // timestamp
}

// Equipment record logic:
// Next driver of that tractor/trailer sees prior defects were
// signed off, including the date and which mechanic signed off,
// clearing the unsafe status.

// ============================================================
// COLLECTION: chat_messages
// Driver-to-driver chat. Supports groups for multi-driver convos.
// Badge/count on chat button shows new messages since last login.
// No push notifications.
// ============================================================
export const ChatMessage = {
  senderId: '',       // string, reference to drivers collection
  senderName: '',     // string, denormalized
  groupId: null,      // string | null, reference to chat_groups (null = direct message)
  recipientId: null,  // string | null, for direct messages
  text: '',           // string
  readBy: [],         // array of driver IDs who have read it
  createdAt: null,    // timestamp
}

// ============================================================
// COLLECTION: chat_groups
// ============================================================
export const ChatGroup = {
  name: '',           // string
  members: [],        // array of driver IDs
  createdBy: '',      // string, driver ID
  createdAt: null,    // timestamp
}

// ============================================================
// ROLES SUMMARY
// - driver: creates DVIRs, chats, downloads own PDF
// - supervisor: sees all DVIRs in real time, notified on submit
// - shop: reviews and resolves defects
// - admin: Larry only. Badge approval, analytics reporting
//   (login activity per driver, more detail than supervisors)
// ============================================================

// ============================================================
// RETENTION
// All data stored for 90 days minimum, matching FMCSA
// requirement under 49 CFR 396.11(a)(4): DVIR, repair
// certification, and next-driver review must be retained
// three months from the date the report was prepared.
// Industry best practice is 12-24 months for audit defense.
// ============================================================

// ============================================================
// PDF
// Drivers can generate and download a PDF of their completed
// DVIR for that day to save on their phone.
// ============================================================

// ============================================================
// UI NOTES
// - DVIR creation button and chat button at TOP of screen
// - Same badge/count approach on both buttons
// - Landing page: headline 'FleetDVIR', tagline 'Digital
//   inspection reports for trucking fleets', feature bullets,
//   Sign In button front and center, Admin Analytics button,
//   footer 'Ralph's Grocery'
// ============================================================