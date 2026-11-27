import { Route, Routes } from "react-router-dom";
import PublicLayout, { Contained } from "./components/PublicLayout";
import StaffLayout from "./components/StaffLayout";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import OrganizationsPage from "./pages/OrganizationsPage";
import PublicIssues from "./pages/PublicIssues";
import ReportForm from "./pages/ReportForm";
import StaffArea from "./pages/StaffArea";
import StaffReport from "./pages/StaffReport";
import TrackReport from "./pages/TrackReport";
import UsersPage from "./pages/UsersPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route element={<Contained />}>
          <Route path="issues" element={<PublicIssues />} />
          <Route path="report" element={<ReportForm />} />
          <Route path="track" element={<TrackReport />} />
          <Route path="*" element={<p className="py-16">Page not found.</p>} />
        </Route>
      </Route>

      <Route path="staff" element={<StaffLayout />}>
        <Route index element={<StaffArea />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="report/:id" element={<StaffReport />} />
      </Route>
    </Routes>
  );
}
