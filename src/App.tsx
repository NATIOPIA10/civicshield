import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ReportForm from "./pages/ReportForm";
import PublicIssues from "./pages/PublicIssues";
import TrackReport from "./pages/TrackReport";
import StaffArea from "./pages/StaffArea";
import StaffReport from "./pages/StaffReport";
import Dashboard from "./pages/Dashboard";
import OrganizationsPage from "./pages/OrganizationsPage";
import UsersPage from "./pages/UsersPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="issues" element={<PublicIssues />} />
        <Route path="report" element={<ReportForm />} />
        <Route path="track" element={<TrackReport />} />
        <Route path="staff" element={<StaffArea />} />
        <Route path="staff/dashboard" element={<Dashboard />} />
        <Route path="staff/organizations" element={<OrganizationsPage />} />
        <Route path="staff/users" element={<UsersPage />} />
        <Route path="staff/report/:id" element={<StaffReport />} />
        <Route path="*" element={<p className="py-16">Page not found.</p>} />
      </Route>
    </Routes>
  );
}
