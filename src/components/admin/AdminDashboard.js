import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import CreateUserModal from './CreateUserModal';
import EventManagement from './EventManagement';
import EditUserModal from './EditUserModal';
import './AdminDashboard.css';
import Header from '../common/Header';
import { FaDownload, FaUsers, FaTicketAlt, FaEuroSign, FaHistory } from 'react-icons/fa';
import { generateGlobalStatisticsPDF } from '../../services/ReportService';
import AssignmentModal from './AssignmentModal';
import ThemeToggle from '../shared/ThemeToggle';
import { generateOptimizedReport } from '../../services/OptimizedReportService';
import TicketHistory from './TicketHistory';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createUserType, setCreateUserType] = useState(null);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [managers, setManagers] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [editingUser, setEditingUser] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTickets: 0,
    totalRevenue: 0
  });
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  async function fetchUsers() {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setUsers(usersData);
      setManagers(usersData.filter(user => user.role === 'manager'));
      setTeamLeaders(usersData.filter(user => user.role === 'teamLeader'));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      // Recupera statistiche utenti
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      // Recupera statistiche biglietti
      const ticketsRef = collection(db, 'tickets');
      const ticketsSnapshot = await getDocs(ticketsRef);
      
      let totalTickets = 0;
      let totalRevenue = 0;
      
      ticketsSnapshot.docs.forEach(doc => {
        const ticket = doc.data();
        totalTickets += ticket.quantity || 0;
        totalRevenue += ticket.totalPrice || 0;
      });

      setStats({
        totalUsers: usersSnapshot.size,
        totalTickets,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }

  const handleCreateUser = (userType) => {
    setCreateUserType(userType);
    setShowCreateModal(true);
  };

  const handleDownloadReport = async () => {
    try {
      setDownloadingReport(true);
      setDownloadError(null);
      console.log('Avvio generazione report ottimizzato...');
      await generateOptimizedReport();
      console.log('Report ottimizzato generato con successo');
      alert('Report ottimizzato generato con successo!');
    } catch (error) {
      console.error('Errore nel download del report:', error);
      setDownloadError(`Errore nella generazione del report: ${error.message}`);
    } finally {
      setDownloadingReport(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (
      user.email.toLowerCase().includes(filter.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(filter.toLowerCase()))
    );
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return <div className="loading-container">Caricamento dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <Header />
      <div className="dashboard-header">
        <h1>Dashboard Amministratore</h1>
        <div className="header-actions">
          <button 
            className={`btn-download ${downloadingReport ? 'loading' : ''}`}
            onClick={handleDownloadReport}
            disabled={downloadingReport}
          >
            <FaDownload /> {downloadingReport ? 'Generazione in corso...' : 'Scarica Statistiche'}
          </button>
          {downloadError && (
            <div className="error-message">
              {downloadError}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-content">
        <div className="admin-dashboard">
          <div className="admin-tabs">
            <button 
              className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Gestione Utenti
            </button>
            <button 
              className={`tab-button ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Gestione Eventi
            </button>
            <button 
              className={`tab-button ${activeTab === 'tickets' ? 'active' : ''}`}
              onClick={() => setActiveTab('tickets')}
            >
              <FaHistory /> Storico Biglietti
            </button>
          </div>

          {activeTab === 'users' ? (
            <>
              <div className="dashboard-header">
                <h2>Gestione Utenti</h2>
                <div className="action-buttons">
                  <button onClick={() => handleCreateUser('manager')}>
                    Nuovo Manager
                  </button>
                  <button onClick={() => handleCreateUser('teamLeader')}>
                    Nuovo Team Leader
                  </button>
                  <button onClick={() => handleCreateUser('promoter')}>
                    Nuovo Promoter
                  </button>
                  <button onClick={() => handleCreateUser('validator')}>
                    Nuovo Validatore
                  </button>
                </div>
              </div>

              <div className="filters">
                <input
                  type="text"
                  placeholder="Cerca per nome o email..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="search-input"
                />
                
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="role-filter"
                >
                  <option value="all">Tutti i ruoli</option>
                  <option value="manager">Manager</option>
                  <option value="teamLeader">Team Leader</option>
                  <option value="promoter">Promoter</option>
                  <option value="validator">Validatore</option>
                </select>
              </div>

              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Ruolo</th>
                      <th>Assegnato a</th>
                      <th>Stato</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td data-label="Nome">{user.name}</td>
                        <td data-label="Email">{user.email}</td>
                        <td data-label="Ruolo">{user.role}</td>
                        <td data-label="Assegnato a">
                          {user.teamLeaderId && `Team Leader: ${
                            teamLeaders.find(tl => tl.id === user.teamLeaderId)?.name || 'N/A'
                          }`}
                          {user.managerId && `Manager: ${
                            managers.find(m => m.id === user.managerId)?.name || 'N/A'
                          }`}
                        </td>
                        <td data-label="Stato">{user.status}</td>
                        <td data-label="Azioni">
                          <div className="action-buttons">
                            <button 
                              className="btn btn-primary"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditModal(true);
                              }}
                            >
                              Gestisci
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : activeTab === 'events' ? (
            <EventManagement />
          ) : activeTab === 'tickets' ? (
            <TicketHistory />
          ) : null}

          {showCreateModal && (
            <CreateUserModal
              userType={createUserType}
              teamLeaders={teamLeaders}
              managers={managers}
              onClose={() => setShowCreateModal(false)}
              onUserCreated={fetchUsers}
            />
          )}

          {showEditModal && selectedUser && (
            <EditUserModal
              user={selectedUser}
              managers={managers}
              teamLeaders={teamLeaders}
              onClose={() => {
                setShowEditModal(false);
                setSelectedUser(null);
              }}
              onUpdate={fetchUsers}
            />
          )}

          <div className="stats-overview">
            <div className="stat-card">
              <div className="stat-icon">
                <FaUsers />
              </div>
              <div className="stat-info">
                <h3>Utenti Totali</h3>
                <div className="stat-value">{stats.totalUsers}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FaTicketAlt />
              </div>
              <div className="stat-info">
                <h3>Biglietti Venduti</h3>
                <div className="stat-value">{stats.totalTickets}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FaEuroSign />
              </div>
              <div className="stat-info">
                <h3>Ricavo Totale</h3>
                <div className="stat-value">€{stats.totalRevenue.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ThemeToggle />
    </div>
  );
}

export default AdminDashboard; 