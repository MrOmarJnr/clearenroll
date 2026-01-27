import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* ================= AUTH ================= */
import ProtectedRoute from "./auth/ProtectedRoute";

/* ================= LAYOUT ================= */
import DashboardLayout from "./layouts/DashboardLayout";

/* ================= AUTH PAGES ================= */
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

/* ================= CORE ================= */
import Dashboard from "./pages/dashboard/Dashboard";


/* ================= allrecords ================= */
import CreateRecords from "./pages/allinone/allinone";

/* ================= VERIFY ================= */
import Verify from "./pages/verify/Verify";
import VerifyEnrollment from "./pages/verify/VerifyEnrollment";

/* ================= DATA ================= */
import Parents from "./pages/parents/Parents";
import AddParent from "./pages/parents/AddParent";
import ParentsImport from "./pages/parents/ParentsImport";
import EditParent from "./pages/parents/EditParent";

import Students from "./pages/students/Students";
import AddStudent from "./pages/students/AddStudent";
import StudentsImport from "./pages/students/StudentsImport"; 
import EditStudent from "./pages/students/EditStudent";

import Flags from "./pages/flags/Flags";
import CreateFlag from "./pages/flags/CreateFlag";

/* ================= SYSTEM ================= */
import Consents from "./pages/consents/Consents";
import DuplicateReviews from "./pages/duplicates/DuplicateReviews";
import Schools from "./pages/schools/Schools";

/* ================= Audit ================= */
import FlagAudit from "./pages/flags/FlagAudit";

/* ================= dashboard ================= */
import DashboardAnalytics from "./pages/dashboard/DashboardAnalytics";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= PUBLIC ================= */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* ================= PROTECTED ================= */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          
        <Route path="/dashboard/analytics" element={<DashboardAnalytics />} />




          {/* records */}
          <Route path="/allrecords" element={<CreateRecords />} />

          {/* Verify */}
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/enrollment" element={<VerifyEnrollment />} />

          {/* Parents */}
          <Route path="/parents" element={<Parents />} />
          <Route path="/parents/add" element={<AddParent />} />
          <Route path="/parents/import" element={<ParentsImport />} />
          <Route path="/parents/:id/edit" element={<EditParent />} />

          {/* Students */}
          <Route path="/students" element={<Students />} />
          <Route path="/students/add" element={<AddStudent />} />
           <Route path="/students/import" element={<StudentsImport />} />
           <Route path="/students/:id/edit" element={<EditStudent />} />

          {/* Flags */}
          <Route path="/flags" element={<Flags />} />
          <Route path="/flags/create" element={<CreateFlag />} />

           {/* audit */}
           <Route path="/flags/audit" element={<FlagAudit />} />

          {/* System */}
          <Route path="/consents" element={<Consents />} />
          <Route path="/duplicates" element={<DuplicateReviews />} />
          <Route path="/schools" element={<Schools />} />
        </Route>

        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
