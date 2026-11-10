import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';

import { LoginPage } from '../pages/auth/LoginPage';
import { SignupPage } from '../pages/auth/SignupPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { LocationsPage } from '../pages/locations/LocationsPage';
import { EventsListPage } from '../pages/events/EventsListPage';
import { CreateEventPage } from '../pages/events/CreateEventPage';
import { EventDetailPage } from '../pages/events/EventDetailPage';
import { EditEventPage } from '../pages/events/EditEventPage';
import { InvestigationsPage } from '../pages/investigations/InvestigationsPage';
import { RelationshipsPage } from '../pages/relationships/RelationshipsPage';
import { EvidencePage } from '../pages/evidence/EvidencePage';
import { ImpactsPage } from '../pages/impacts/ImpactsPage';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { EventInvestigationReportPage } from '../pages/reports/EventInvestigationReportPage';
import { ReferencesPage } from '../pages/references/ReferencesPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Authenticated Application Shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="locations" element={<LocationsPage />} />

        {/* Events Module */}
        <Route path="events" element={<EventsListPage />} />
        <Route path="events/create" element={<CreateEventPage />} />
        <Route path="events/:eventId" element={<EventDetailPage />} />
        <Route path="events/:eventId/edit" element={<EditEventPage />} />

        {/* Investigation & Causal Graph Modules */}
        <Route path="investigations" element={<InvestigationsPage />} />
        <Route path="relationships" element={<RelationshipsPage />} />
        <Route path="evidence" element={<EvidencePage />} />
        <Route path="impacts" element={<ImpactsPage />} />

        {/* Reports & Analytics */}
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="reports/investigation/:eventId"
          element={<EventInvestigationReportPage />}
        />

        {/* Reference Data & System Profile */}
        <Route path="references" element={<ReferencesPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch all 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

