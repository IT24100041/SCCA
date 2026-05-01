import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const API_ENDPOINTS = {
  users: "/api/users",
  packages: "/api/packages",
  subscriptions: "/api/subscriptions",
  tasks: "/api/tasks",
  payments: "/api/payments",
  metrics: "/api/metrics",
  recommendations: "/api/recommendations",
};

const AUTH_TOKEN_STORAGE_KEY = "sparklenz_auth_token";
const AUTH_USER_STORAGE_KEY = "sparklenz_auth_user";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "clients", label: "Clients" },
  { key: "packages", label: "Packages & Subscriptions" },
  { key: "tasks", label: "Tasks" },
  { key: "users", label: "Staff / Users" },
  { key: "payments", label: "Payments" },
  { key: "performance", label: "Performance Reports" },
  { key: "settings", label: "Settings" },
];

const CLIENT_STORAGE_KEY = "sparklenz_clients_v1";
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const TASK_STATUS_COLUMNS = [
  { key: "pending", label: "Pending" },
  { key: "in-progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

const initialUserForm = {
  name: "",
  email: "",
  password: "",
  role: "staff",
  isActive: true,
};

const initialPackageForm = {
  name: "Silver",
  price: "",
  description: "",
  features: "",
};

const initialSubscriptionForm = {
  clientName: "",
  packageId: "",
  status: "active",
  startDate: "",
  endDate: "",
};

const initialTaskForm = {
  title: "",
  description: "",
  assignedTo: "",
  status: "pending",
  dueDate: "",
};

const initialPaymentForm = {
  clientName: "",
  amount: "",
  paymentDate: "",
  method: "other",
  status: "paid",
  note: "",
};

const initialMetricForm = {
  campaignName: "",
  platform: "",
  impressions: "",
  reach: "",
  engagement: "",
  leads: "",
  recordedAt: "",
};

const initialClientForm = {
  id: "",
  name: "",
  email: "",
  company: "",
  packageId: "",
  status: "active",
};

const initialLoginForm = {
  email: "",
  password: "",
};

const initialRegisterForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "staff",
};

function sanitizeClientName(value) {
  return String(value || "").trim().toLowerCase();
}

function toDateInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  const text = toDateInput(value);
  return text || "-";
}

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function currency(value) {
  return `$${safeNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function readClientsFromStorage() {
  try {
    const raw = window.localStorage.getItem(CLIENT_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function persistClientsToStorage(clients) {
  window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clients));
}

function readAuthSessionFromStorage() {
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
    const rawUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    const user = rawUser ? JSON.parse(rawUser) : null;
    return {
      token,
      user,
    };
  } catch (error) {
    return {
      token: "",
      user: null,
    };
  }
}

function persistAuthSession(token, user) {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

function clearAuthSession() {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

function getStoredAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

async function requestJson(path, options = {}) {
  const authToken = getStoredAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed (${response.status})`);
  }

  return payload;
}

function SimpleBarChart({ data, valueKey, labelKey, colorClass, formatter = (v) => v }) {
  const highest = Math.max(...data.map((item) => safeNumber(item[valueKey])), 0);
  const maxValue = highest || 1;

  return (
    <div className="chart-shell" role="img" aria-label="Bar chart">
      <div className="bars">
        {data.map((item) => {
          const value = safeNumber(item[valueKey]);
          const height = Math.max((value / maxValue) * 100, 5);

          return (
            <div className="bar-group" key={`${item[labelKey]}-${value}`}>
              <div className="bar-value">{formatter(value)}</div>
              <div className={`bar ${colorClass || ""}`} style={{ height: `${height}%` }} />
              <div className="bar-label">{item[labelKey]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PerformanceLineChart({ data }) {
  const width = 560;
  const height = 220;
  const max = Math.max(
    ...data.map((item) => Math.max(safeNumber(item.reach), safeNumber(item.impressions))),
    0
  );
  const maxValue = max || 1;

  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const toPolyline = (key) => {
    return data
      .map((item, index) => {
        const x = index * stepX;
        const y = height - (safeNumber(item[key]) / maxValue) * height;
        return `${x},${y}`;
      })
      .join(" ");
  };

  return (
    <div className="line-chart-shell" role="img" aria-label="Reach and impressions chart">
      <svg viewBox={`0 0 ${width} ${height + 4}`} preserveAspectRatio="none">
        <polyline className="line line-reach" points={toPolyline("reach")} />
        <polyline className="line line-impressions" points={toPolyline("impressions")} />
      </svg>
      <div className="line-legend">
        <span>
          <i className="dot dot-reach" /> Reach
        </span>
        <span>
          <i className="dot dot-impressions" /> Impressions
        </span>
      </div>
      <div className="line-labels">
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [authSession, setAuthSession] = useState(() => readAuthSessionFromStorage());
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [authBusy, setAuthBusy] = useState(false);

  const authToken = authSession.token;
  const currentUser = authSession.user;

  const [users, setUsers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [clients, setClients] = useState([]);

  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [userForm, setUserForm] = useState(initialUserForm);
  const [packageForm, setPackageForm] = useState(initialPackageForm);
  const [subscriptionForm, setSubscriptionForm] = useState(initialSubscriptionForm);
  const [taskForm, setTaskForm] = useState(initialTaskForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [metricForm, setMetricForm] = useState(initialMetricForm);
  const [clientForm, setClientForm] = useState(initialClientForm);

  const [editingUserId, setEditingUserId] = useState("");
  const [editingPackageId, setEditingPackageId] = useState("");
  const [editingSubscriptionId, setEditingSubscriptionId] = useState("");
  const [editingTaskId, setEditingTaskId] = useState("");
  const [editingPaymentId, setEditingPaymentId] = useState("");
  const [editingMetricId, setEditingMetricId] = useState("");

  const [tasksView, setTasksView] = useState("table");
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState("");

  const [performanceFilter, setPerformanceFilter] = useState({
    client: "all",
    month: "all",
    year: String(new Date().getFullYear()),
  });

  const [recClientName, setRecClientName] = useState("");
  const [recBudget, setRecBudget] = useState("");
  const [recCompanySize, setRecCompanySize] = useState("");
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const packageById = new Map();
  packages.forEach((item) => {
    packageById.set(item._id, item);
  });

  const clientMap = new Map();

  const ensureClient = (name) => {
    const normalized = sanitizeClientName(name);
    if (!normalized) {
      return null;
    }

    if (!clientMap.has(normalized)) {
      clientMap.set(normalized, {
        id: normalized,
        name: String(name || "").trim(),
        email: "",
        company: "",
        packageId: "",
        packageName: "-",
        status: "active",
        totalPaid: 0,
      });
    }

    return clientMap.get(normalized);
  };

  clients.forEach((client) => {
    const current = ensureClient(client.name);
    if (!current) {
      return;
    }

    current.id = client.id || current.id;
    current.name = client.name || current.name;
    current.email = client.email || "";
    current.company = client.company || "";
    current.packageId = client.packageId || current.packageId;
    current.status = client.status || current.status;
  });

  subscriptions.forEach((subscription) => {
    const current = ensureClient(subscription.clientName);
    if (!current) {
      return;
    }

    const packageId =
      typeof subscription.packageId === "object"
        ? subscription.packageId?._id
        : subscription.packageId;

    if (packageId) {
      current.packageId = packageId;
    }

    if (subscription.status) {
      current.status = subscription.status;
    }
  });

  payments.forEach((payment) => {
    const current = ensureClient(payment.clientName);
    if (!current) {
      return;
    }

    current.totalPaid += safeNumber(payment.amount);
  });

  const clientDirectory = [...clientMap.values()]
    .map((client) => {
      const resolvedPackage = packageById.get(client.packageId);
      return {
        ...client,
        packageName: resolvedPackage?.name || client.packageName || "-",
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  let selectedClient = null;
  if (selectedClientName) {
    selectedClient =
      clientDirectory.find(
        (client) => sanitizeClientName(client.name) === sanitizeClientName(selectedClientName)
      ) || null;
  }

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  let monthlyRevenue = 0;

  payments.forEach((payment) => {
    const date = new Date(payment.paymentDate || payment.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) {
      return;
    }

    if (date.getMonth() !== month || date.getFullYear() !== year) {
      return;
    }

    if (payment.status && payment.status !== "paid") {
      return;
    }

    monthlyRevenue += safeNumber(payment.amount);
  });

  const today = toDateInput(new Date());
  const tasksDueToday = tasks.filter((task) => toDateInput(task.dueDate) === today).length;

  const recentTasks = [...tasks]
    .sort((left, right) => {
      const leftDate = new Date(left.dueDate || left.createdAt || 0).getTime();
      const rightDate = new Date(right.dueDate || right.createdAt || 0).getTime();
      return leftDate - rightDate;
    })
    .slice(0, 6);

  const revenueChartData = MONTH_NAMES.map((label) => ({ label, value: 0 }));
  payments.forEach((payment) => {
    const date = new Date(payment.paymentDate || payment.createdAt || Date.now());
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) {
      return;
    }

    revenueChartData[date.getMonth()].value += safeNumber(payment.amount);
  });

  const performanceNameSet = new Set();
  metrics.forEach((metric) => {
    if (metric.campaignName) {
      performanceNameSet.add(metric.campaignName.trim());
    }
  });
  clientDirectory.forEach((client) => {
    if (client.name) {
      performanceNameSet.add(client.name.trim());
    }
  });
  const performanceClientOptions = [...performanceNameSet].sort((left, right) =>
    left.localeCompare(right)
  );

  const filteredMetrics = metrics.filter((metric) => {
    const date = new Date(metric.recordedAt || metric.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    if (performanceFilter.client !== "all") {
      const metricName = sanitizeClientName(metric.campaignName);
      const selectedName = sanitizeClientName(performanceFilter.client);
      if (metricName !== selectedName) {
        return false;
      }
    }

    if (performanceFilter.year !== "all" && String(date.getFullYear()) !== performanceFilter.year) {
      return false;
    }

    if (performanceFilter.month !== "all" && String(date.getMonth() + 1) !== performanceFilter.month) {
      return false;
    }

    return true;
  });

  let totalReach = 0;
  let totalImpressions = 0;
  let totalEngagement = 0;

  filteredMetrics.forEach((metric) => {
    totalReach += safeNumber(metric.reach);
    totalImpressions += safeNumber(metric.impressions);
    totalEngagement += safeNumber(metric.engagement);
  });

  const performanceCards = {
    reach: totalReach,
    impressions: totalImpressions,
    engagement: filteredMetrics.length > 0 ? totalEngagement / filteredMetrics.length : 0,
  };

  const selectedYear =
    performanceFilter.year === "all"
      ? String(new Date().getFullYear())
      : performanceFilter.year;

  const performanceTrendData = MONTH_NAMES.map((label) => ({
    label,
    reach: 0,
    impressions: 0,
  }));

  metrics.forEach((metric) => {
    const date = new Date(metric.recordedAt || metric.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) {
      return;
    }

    if (String(date.getFullYear()) !== selectedYear) {
      return;
    }

    if (performanceFilter.client !== "all") {
      const metricName = sanitizeClientName(metric.campaignName);
      const selectedName = sanitizeClientName(performanceFilter.client);
      if (metricName !== selectedName) {
        return;
      }
    }

    const index = date.getMonth();
    performanceTrendData[index].reach += safeNumber(metric.reach);
    performanceTrendData[index].impressions += safeNumber(metric.impressions);
  });

  const revenueTrendData = MONTH_NAMES.map((label) => ({
    label,
    value: 0,
  }));

  payments.forEach((payment) => {
    const date = new Date(payment.paymentDate || payment.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) {
      return;
    }

    if (String(date.getFullYear()) !== selectedYear) {
      return;
    }

    revenueTrendData[date.getMonth()].value += safeNumber(payment.amount);
  });

  const balanceMap = new Map();
  payments.forEach((payment) => {
    const key = sanitizeClientName(payment.clientName);
    if (!key) {
      return;
    }

    if (!balanceMap.has(key)) {
      balanceMap.set(key, {
        clientName: payment.clientName,
        amount: 0,
      });
    }

    balanceMap.get(key).amount += safeNumber(payment.amount);
  });

  const clientBalanceRows = [...balanceMap.values()].sort((left, right) => right.amount - left.amount);

  const visibleNavItems =
    currentUser?.role === "staff"
      ? NAV_ITEMS.filter((item) => item.key !== "users")
      : NAV_ITEMS;

  const currentTitle =
    visibleNavItems.find((entry) => entry.key === activePage)?.label || "Dashboard";

  const fetchResource = useCallback(async (resourceKey) => {
    const payload = await requestJson(API_ENDPOINTS[resourceKey]);

    switch (resourceKey) {
      case "users":
        setUsers(Array.isArray(payload) ? payload : []);
        break;
      case "packages":
        setPackages(Array.isArray(payload) ? payload : []);
        break;
      case "subscriptions":
        setSubscriptions(Array.isArray(payload) ? payload : []);
        break;
      case "tasks":
        setTasks(Array.isArray(payload) ? payload : []);
        break;
      case "payments":
        setPayments(Array.isArray(payload) ? payload : []);
        break;
      case "metrics":
        setMetrics(Array.isArray(payload) ? payload : []);
        break;
      default:
        break;
    }
  }, []);

  const loadAllData = useCallback(async () => {
    if (!authToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const resources =
      currentUser?.role === "staff"
        ? Object.keys(API_ENDPOINTS).filter(
            (resource) => resource !== "users" && resource !== "recommendations"
          )
        : Object.keys(API_ENDPOINTS).filter((resource) => resource !== "recommendations");

    const result = await Promise.allSettled(resources.map((resource) => fetchResource(resource)));
    const failedCount = result.filter((item) => item.status === "rejected").length;

    if (failedCount > 0) {
      setError(
        `Some backend resources failed to load (${failedCount}/${resources.length}). Check API server and database status.`
      );
    }

    setLoading(false);
  }, [authToken, currentUser?.role, fetchResource]);

  useEffect(() => {
    setClients(readClientsFromStorage());
  }, []);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    loadAllData();
  }, [authToken, loadAllData]);

  useEffect(() => {
    if (currentUser?.role !== "staff") {
      return;
    }

    if (activePage === "users") {
      setActivePage("dashboard");
    }
  }, [activePage, currentUser?.role]);

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const saveClients = (nextClients) => {
    setClients(nextClients);
    persistClientsToStorage(nextClients);
  };

  const goTo = (pageKey) => {
    clearMessages();
    setActivePage(pageKey);
  };

  const handleRefreshAll = async () => {
    if (!authToken) {
      return;
    }

    clearMessages();
    await loadAllData();
    setNotice("Data refreshed from API.");
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setAuthBusy(true);
    clearMessages();

    try {
      const payload = await requestJson("/api/users/login", {
        method: "POST",
        body: JSON.stringify({
          email: loginForm.email.trim(),
          password: loginForm.password,
        }),
      });

      if (!payload?.token || !payload?.user) {
        throw new Error("Login response is missing token or user information.");
      }

      persistAuthSession(payload.token, payload.user);
      setAuthSession({
        token: payload.token,
        user: payload.user,
      });
      setLoginForm(initialLoginForm);
      setActivePage("dashboard");
      setNotice(`Welcome back, ${payload.user.name || payload.user.email}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setAuthBusy(true);
    clearMessages();

    if (registerForm.password.length < 6) {
      setError("Password must be at least 6 characters.");
      setAuthBusy(false);
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Password and confirm password do not match.");
      setAuthBusy(false);
      return;
    }

    try {
      const payload = await requestJson("/api/users/register", {
        method: "POST",
        body: JSON.stringify({
          name: registerForm.name.trim(),
          email: registerForm.email.trim(),
          password: registerForm.password,
          role: registerForm.role,
        }),
      });

      if (!payload?.token || !payload?.user) {
        throw new Error("Registration response is missing token or user information.");
      }

      persistAuthSession(payload.token, payload.user);
      setAuthSession({
        token: payload.token,
        user: payload.user,
      });
      setRegisterForm(initialRegisterForm);
      setAuthMode("login");
      setActivePage("dashboard");
      setNotice(`Account created. Welcome, ${payload.user.name || payload.user.email}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setAuthSession({
      token: "",
      user: null,
    });

    setUsers([]);
    setPackages([]);
    setSubscriptions([]);
    setTasks([]);
    setPayments([]);
    setMetrics([]);

    setLoading(false);
    setBusyAction("");
    setError("");
    setNotice("");
    setShowClientModal(false);
    setSelectedClientName("");
    setLoginForm(initialLoginForm);
    setRegisterForm(initialRegisterForm);
    setAuthMode("login");
    setActivePage("dashboard");
  };

  const handleUserSubmit = async (event) => {
    event.preventDefault();
    setBusyAction("users");
    clearMessages();

    const payload = {
      name: userForm.name.trim(),
      email: userForm.email.trim(),
      role: userForm.role,
      isActive: Boolean(userForm.isActive),
    };

    if (!editingUserId || userForm.password.trim()) {
      payload.password = userForm.password;
    }

    if (!editingUserId && !payload.password) {
      setError("Password is required for new users.");
      setBusyAction("");
      return;
    }

    try {
      if (editingUserId) {
        await requestJson(`${API_ENDPOINTS.users}/${editingUserId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson(API_ENDPOINTS.users, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setUserForm(initialUserForm);
      setEditingUserId("");
      await fetchResource("users");
      setNotice(editingUserId ? "User updated." : "User created.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  };

  const handleUserEdit = (user) => {
    setUserForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "staff",
      isActive: Boolean(user.isActive),
    });
    setEditingUserId(user._id);
    setNotice("Editing user profile.");
    setError("");
  };

  const handleUserDelete = async (id) => {
    const confirmed = window.confirm("Delete this user?");
    if (!confirmed) {
      return;
    }

    setBusyAction("users");
    clearMessages();

    try {
      await requestJson(`${API_ENDPOINTS.users}/${id}`, {
        method: "DELETE",
      });
      await fetchResource("users");
      setNotice("User deleted.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  };

  const handlePackageSubmit = async (event) => {
    event.preventDefault();
    setBusyAction("packages");
    clearMessages();

    const price = safeNumber(packageForm.price);
    const description = packageForm.description.trim();
    const features = packageForm.features
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (price <= 0) {
      setError("Please enter a price greater than zero.");
      setBusyAction("");
      return;
    }

    if (!description) {
      setError("Description cannot be empty");
      setBusyAction("");
      return;
    }

    if (features.length === 0) {
      setError("Features cannot be empty");
      setBusyAction("");
      return;
    }

    const payload = {
      name: packageForm.name,
      price,
      description,
      features,
    };

    try {
      if (editingPackageId) {
        await requestJson(`${API_ENDPOINTS.packages}/${editingPackageId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson(API_ENDPOINTS.packages, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setPackageForm(initialPackageForm);
      setEditingPackageId("");
      await Promise.all([fetchResource("packages"), fetchResource("subscriptions")]);
      setNotice(editingPackageId ? "Package updated." : "Package created.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  };

  const handlePackageEdit = (item) => {
    setPackageForm({
      name: item.name || "Silver",
      price: String(item.price ?? ""),
      description: item.description || "",
      features: Array.isArray(item.features) ? item.features.join(", ") : "",
    });
    setEditingPackageId(item._id);
    setNotice("Editing package.");
    setError("");
  };

  const handlePackageDelete = async (id) => {
    const confirmed = window.confirm("Delete this package?");
    if (!confirmed) {
      return;
    }

    setBusyAction("packages");
    clearMessages();

    try {
      await requestJson(`${API_ENDPOINTS.packages}/${id}`, { method: "DELETE" });
      await Promise.all([fetchResource("packages"), fetchResource("subscriptions")]);
      setNotice("Package deleted.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  };

  const handleSubscriptionSubmit = async (event) => {
    event.preventDefault();
    setBusyAction("subscriptions");
    clearMessages();

    if (subscriptionForm.startDate && subscriptionForm.endDate) {
      if (new Date(subscriptionForm.endDate) <= new Date(subscriptionForm.startDate)) {
        setError("The end date must be after the start date");
        setBusyAction("");
        return;
      }
    }

    const payload = {
      clientName: subscriptionForm.clientName.trim(),
      packageId: subscriptionForm.packageId,
      status: subscriptionForm.status,
      startDate: subscriptionForm.startDate || undefined,
      endDate: subscriptionForm.endDate || undefined,
    };

    try {
      if (editingSubscriptionId) {
        await requestJson(`${API_ENDPOINTS.subscriptions}/${editingSubscriptionId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson(API_ENDPOINTS.subscriptions, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setSubscriptionForm(initialSubscriptionForm);
      setEditingSubscriptionId("");
      await fetchResource("subscriptions");
      setNotice(editingSubscriptionId ? "Subscription updated." : "Subscription created.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  };

  const fetchAiRecommendation = async (event) => {
    event.preventDefault();
    if (!recClientName.trim()) {
      setError("Client name is required for recommendation");
      return;
    }
    setIsAiLoading(true);
    clearMessages();
    try {
      const data = await requestJson(API_ENDPOINTS.recommendations, {
        method: "POST",
        body: JSON.stringify({
          clientName: recClientName,
          clientData: {
            budget: recBudget,
            size: recCompanySize,
          },
        }),
      });
      setAiRecommendation(data.recommendation);
      setNotice("Recommendation received");
    } catch (requestError) {
      setError(requestError.message || "Failed to get AI recommendation");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubscriptionEdit = (item) => {
    const packageId =
      typeof item.packageId === "object" ? item.packageId?._id || "" : item.packageId || "";

    setSubscriptionForm({
      clientName: item.clientName || "",
      packageId,
      status: item.status || "active",
      startDate: toDateInput(item.startDate),
      endDate: toDateInput(item.endDate),
    });
    setEditingSubscriptionId(item._id);
    setNotice("Editing subscription.");
    setError("");
  };

  const handleSubscriptionDelete = async (id) => {
    const confirmed = window.confirm("Delete this subscription?");
    if (!confirmed) {
      return;
    }

    setBusyAction("subscriptions");
    clearMessages();

    try {
      await requestJson(`${API_ENDPOINTS.subscriptions}/${id}`, {
        method: "DELETE",
      });
      await fetchResource("subscriptions");
      setNotice("Subscription deleted.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  };

  const handleTaskSubmit = async (event) => {
    event.preventDefault();
    setBusyAction("tasks");
    clearMessages();

    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      assignedTo: taskForm.assignedTo.trim(),
      status: taskForm.status,
      dueDate: taskForm.dueDate || undefined,
    };

    try {
      if (editingTaskId) {
        await requestJson(`${API_ENDPOINTS.tasks}/${editingTaskId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson(API_ENDPOINTS.tasks, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setTaskForm(initialTaskForm);
      setEditingTaskId("");
      await fetchResource("tasks");
      setNotice(editingTaskId ? "Task updated." : "Task created.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  };

  const handleTaskEdit = (item) => {
    setTaskForm({
      title: item.title || "",
      description: item.description || "",
      assignedTo: item.assignedTo || "",
      status: item.status || "pending",
      dueDate: toDateInput(item.dueDate),
    });
    setEditingTaskId(item._id);
    setNotice("Editing task.");
    setError("");
  };

  const handleTaskDelete = async (id) => {
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) {
      return;
    }

    setBusyAction("tasks");
    clearMessages();

    try {
      await requestJson(`${API_ENDPOINTS.tasks}/${id}`, { method: "DELETE" });
      await fetchResource("tasks");
      setNotice("Task deleted.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    setBusyAction("payments");
    clearMessages();

    const payload = {
      clientName: paymentForm.clientName.trim(),
      amount: safeNumber(paymentForm.amount),
      paymentDate: paymentForm.paymentDate || undefined,
      method: paymentForm.method,
      status: paymentForm.status,
      note: paymentForm.note.trim(),
    };

    try {
      if (editingPaymentId) {
        await requestJson(`${API_ENDPOINTS.payments}/${editingPaymentId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson(API_ENDPOINTS.payments, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setPaymentForm(initialPaymentForm);
      setEditingPaymentId("");
      await fetchResource("payments");
      setNotice(editingPaymentId ? "Payment updated." : "Payment logged.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  };

  const handlePaymentEdit = (item) => {
    setPaymentForm({
      clientName: item.clientName || "",
      amount: String(item.amount ?? ""),
      paymentDate: toDateInput(item.paymentDate),
      method: item.method || "other",
      status: item.status || "paid",
      note: item.note || "",
    });
    setEditingPaymentId(item._id);
    setNotice("Editing payment.");
    setError("");
  };

  const handlePaymentDelete = async (id) => {
    const confirmed = window.confirm("Delete this payment record?");
    if (!confirmed) {
      return;
    }

    setBusyAction("payments");
    clearMessages();

    try {
      await requestJson(`${API_ENDPOINTS.payments}/${id}`, { method: "DELETE" });
      await fetchResource("payments");
      setNotice("Payment record deleted.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  };

  const handleMetricSubmit = async (event) => {
    event.preventDefault();
    setBusyAction("metrics");
    clearMessages();

    const payload = {
      campaignName: metricForm.campaignName.trim(),
      platform: metricForm.platform.trim(),
      impressions: safeNumber(metricForm.impressions),
      reach: safeNumber(metricForm.reach),
      engagement: safeNumber(metricForm.engagement),
      leads: safeNumber(metricForm.leads),
      recordedAt: metricForm.recordedAt || undefined,
    };

    try {
      if (editingMetricId) {
        await requestJson(`${API_ENDPOINTS.metrics}/${editingMetricId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson(API_ENDPOINTS.metrics, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setMetricForm(initialMetricForm);
      setEditingMetricId("");
      await fetchResource("metrics");
      setNotice(editingMetricId ? "Metric updated." : "Metric added.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  };

  const handleMetricEdit = (item) => {
    setMetricForm({
      campaignName: item.campaignName || "",
      platform: item.platform || "",
      impressions: String(item.impressions ?? ""),
      reach: String(item.reach ?? ""),
      engagement: String(item.engagement ?? ""),
      leads: String(item.leads ?? ""),
      recordedAt: toDateInput(item.recordedAt),
    });
    setEditingMetricId(item._id);
    setNotice("Editing metric.");
    setError("");
  };

  const handleMetricDelete = async (id) => {
    const confirmed = window.confirm("Delete this metric?");
    if (!confirmed) {
      return;
    }

    setBusyAction("metrics");
    clearMessages();

    try {
      await requestJson(`${API_ENDPOINTS.metrics}/${id}`, { method: "DELETE" });
      await fetchResource("metrics");
      setNotice("Metric deleted.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  };

  const openNewClientModal = () => {
    setClientForm(initialClientForm);
    setShowClientModal(true);
    setNotice("");
    setError("");
  };

  const openClientEditModal = (client) => {
    const localClient = clients.find((item) => sanitizeClientName(item.name) === sanitizeClientName(client.name));

    setClientForm({
      id: localClient?.id || "",
      name: client.name || "",
      email: localClient?.email || "",
      company: localClient?.company || "",
      packageId: localClient?.packageId || client.packageId || "",
      status: localClient?.status || client.status || "active",
    });
    setShowClientModal(true);
    setNotice("Editing client profile (local directory).");
    setError("");
  };

  const handleClientSave = (event) => {
    event.preventDefault();
    clearMessages();

    const payload = {
      id: clientForm.id || `${Date.now()}`,
      name: clientForm.name.trim(),
      email: clientForm.email.trim(),
      company: clientForm.company.trim(),
      packageId: clientForm.packageId || "",
      status: clientForm.status || "active",
    };

    if (!payload.name) {
      setError("Client name is required.");
      return;
    }

    const normalizedName = sanitizeClientName(payload.name);

    const next = [...clients];
    const matchIndex = next.findIndex((item) => {
      if (payload.id && item.id === payload.id) {
        return true;
      }
      return sanitizeClientName(item.name) === normalizedName;
    });

    if (matchIndex >= 0) {
      next[matchIndex] = payload;
    } else {
      next.push(payload);
    }

    saveClients(next);
    setShowClientModal(false);
    setClientForm(initialClientForm);
    setNotice("Client saved in local directory.");
  };

  const handleClientDelete = (clientName) => {
    const confirmed = window.confirm(
      "Remove this client from local directory? API client endpoints are not available yet."
    );
    if (!confirmed) {
      return;
    }

    const normalized = sanitizeClientName(clientName);
    const next = clients.filter((item) => sanitizeClientName(item.name) !== normalized);

    saveClients(next);

    if (sanitizeClientName(selectedClientName) === normalized) {
      setSelectedClientName("");
    }

    setNotice("Client removed from local directory.");
    setError("");
  };

  const exportMetricsCsv = () => {
    if (filteredMetrics.length === 0) {
      setError("No metrics available for current filters.");
      return;
    }

    const header = ["Campaign", "Platform", "Recorded At", "Reach", "Impressions", "Engagement", "Leads"];
    const rows = filteredMetrics.map((item) => [
      item.campaignName || "",
      item.platform || "",
      toDateInput(item.recordedAt),
      safeNumber(item.reach),
      safeNumber(item.impressions),
      safeNumber(item.engagement),
      safeNumber(item.leads),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sparklenz-performance-report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setNotice("Performance report exported as CSV.");
    setError("");
  };

  const renderDashboard = () => (
    <section className="page-section">
      <div className="stats-cards">
        <article className="stat-card">
          <p>Total Clients</p>
          <h3>{clientDirectory.length}</h3>
        </article>
        <article className="stat-card">
          <p>Active Subscriptions</p>
          <h3>{subscriptions.filter((item) => item.status === "active").length}</h3>
        </article>
        <article className="stat-card">
          <p>Tasks Due Today</p>
          <h3>{tasksDueToday}</h3>
        </article>
        <article className="stat-card">
          <p>Monthly Revenue</p>
          <h3>{currency(monthlyRevenue)}</h3>
        </article>
      </div>

      <div className="quick-actions">
        <button type="button" onClick={() => { goTo("clients"); openNewClientModal(); }}>
          Add Client
        </button>
        <button type="button" onClick={() => goTo("tasks")}>
          Create Task
        </button>
        <button type="button" onClick={() => goTo("payments")}>
          Log Payment
        </button>
      </div>

      <div className="two-column">
        <article className="panel">
          <div className="panel-head">
            <h3>Recent Tasks</h3>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No tasks available.</td>
                  </tr>
                ) : (
                  recentTasks.map((task) => (
                    <tr key={task._id}>
                      <td>{task.title || "-"}</td>
                      <td>{task.clientName || "-"}</td>
                      <td>
                        <span className={`pill status-${task.status || "pending"}`}>
                          {task.status || "pending"}
                        </span>
                      </td>
                      <td>{formatDate(task.dueDate)}</td>
                      <td>{task.assignedTo || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Revenue Chart ({new Date().getFullYear()})</h3>
          </div>
          <SimpleBarChart
            data={revenueChartData}
            valueKey="value"
            labelKey="label"
            colorClass="gold"
            formatter={(value) => currency(value)}
          />
        </article>
      </div>
    </section>
  );

  const renderClients = () => {
    const relatedSubscriptions = subscriptions.filter(
      (item) => sanitizeClientName(item.clientName) === sanitizeClientName(selectedClientName)
    );
    const relatedPayments = payments.filter(
      (item) => sanitizeClientName(item.clientName) === sanitizeClientName(selectedClientName)
    );

    return (
      <section className="page-section">
        <div className="page-actions">
          <button type="button" onClick={openNewClientModal}>Add Client</button>
        </div>

        <div className="two-column">
          <article className="panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Package</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clientDirectory.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No clients available yet.</td>
                    </tr>
                  ) : (
                    clientDirectory.map((client) => (
                      <tr key={`${client.id}-${client.name}`}>
                        <td>{client.name || "-"}</td>
                        <td>{client.email || "-"}</td>
                        <td>{client.company || "-"}</td>
                        <td>{client.packageName || "-"}</td>
                        <td>
                          <span className={`pill status-${client.status || "active"}`}>
                            {client.status || "active"}
                          </span>
                        </td>
                        <td className="actions-inline">
                          <button
                            type="button"
                            onClick={() => setSelectedClientName(client.name)}
                          >
                            View
                          </button>
                          <button type="button" onClick={() => openClientEditModal(client)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleClientDelete(client.name)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="hint-text">
              Client records are stored in browser local storage until `/api/clients` is implemented.
            </p>
          </article>

          <article className="panel">
            <div className="panel-head">
              <h3>Client Detail</h3>
            </div>

            {!selectedClient ? (
              <p className="empty-text">Select a client to view detail panel.</p>
            ) : (
              <div className="detail-stack">
                <div>
                  <h4>{selectedClient.name}</h4>
                  <p>{selectedClient.email || "No email"}</p>
                  <p>{selectedClient.company || "No company"}</p>
                </div>
                <div className="detail-grid">
                  <div>
                    <span>Package</span>
                    <strong>{selectedClient.packageName}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{selectedClient.status}</strong>
                  </div>
                  <div>
                    <span>Subscriptions</span>
                    <strong>{relatedSubscriptions.length}</strong>
                  </div>
                  <div>
                    <span>Total Paid</span>
                    <strong>{currency(selectedClient.totalPaid)}</strong>
                  </div>
                  <div>
                    <span>Payments</span>
                    <strong>{relatedPayments.length}</strong>
                  </div>
                </div>
              </div>
            )}
          </article>
        </div>
      </section>
    );
  };

  const renderPackagesAndSubscriptions = () => (
    <section className="page-section">
      <div className="two-column">
        <article className="panel">
          <div className="panel-head">
            <h3>{editingPackageId ? "Edit Package" : "Create Package"}</h3>
          </div>
          <form className="form-grid" onSubmit={handlePackageSubmit}>
            <label>
              <span>Name</span>
              <select
                value={packageForm.name}
                onChange={(event) => setPackageForm((prev) => ({ ...prev, name: event.target.value }))}
              >
                {[
                  "Silver",
                  "Gold",
                  "Platinum",
                  "Diamond",
                ].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Price</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={packageForm.price}
                onChange={(event) => setPackageForm((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
            </label>

            <label>
              <span>Description</span>
              <textarea
                value={packageForm.description}
                onChange={(event) =>
                  setPackageForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </label>

            <label>
              <span>Features (comma separated)</span>
              <input
                type="text"
                value={packageForm.features}
                onChange={(event) =>
                  setPackageForm((prev) => ({ ...prev, features: event.target.value }))
                }
              />
            </label>

            <div className="actions-inline">
              <button type="submit" disabled={busyAction === "packages"}>
                {busyAction === "packages"
                  ? "Saving..."
                  : editingPackageId
                  ? "Update Package"
                  : "Create Package"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPackageForm(initialPackageForm);
                  setEditingPackageId("");
                }}
              >
                Clear
              </button>
            </div>
          </form>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Description</th>
                  <th>Features</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No packages found.</td>
                  </tr>
                ) : (
                  packages.map((item) => (
                    <tr key={item._id}>
                      <td>{item.name}</td>
                      <td>{currency(item.price)}</td>
                      <td>{item.description || "-"}</td>
                      <td>{Array.isArray(item.features) ? item.features.join(", ") : "-"}</td>
                      <td className="actions-inline">
                        <button type="button" onClick={() => handlePackageEdit(item)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handlePackageDelete(item._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>{editingSubscriptionId ? "Edit Subscription" : "Assign Subscription"}</h3>
          </div>
          <form className="form-grid" onSubmit={handleSubscriptionSubmit}>
            <label>
              <span>Client Name</span>
              <input
                type="text"
                value={subscriptionForm.clientName}
                onChange={(event) =>
                  setSubscriptionForm((prev) => ({ ...prev, clientName: event.target.value }))
                }
                required
              />
            </label>

            <label>
              <span>Package</span>
              <select
                value={subscriptionForm.packageId}
                onChange={(event) =>
                  setSubscriptionForm((prev) => ({ ...prev, packageId: event.target.value }))
                }
                required
              >
                <option value="">Select package</option>
                {packages.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} - {currency(item.price)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Status</span>
              <select
                value={subscriptionForm.status}
                onChange={(event) =>
                  setSubscriptionForm((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                {[
                  "active",
                  "paused",
                  "cancelled",
                  "expired",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Start Date</span>
              <input
                type="date"
                value={subscriptionForm.startDate}
                onChange={(event) =>
                  setSubscriptionForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </label>

            <label>
              <span>End Date</span>
              <input
                type="date"
                value={subscriptionForm.endDate}
                onChange={(event) =>
                  setSubscriptionForm((prev) => ({ ...prev, endDate: event.target.value }))
                }
              />
            </label>

            <div className="actions-inline">
              <button type="submit" disabled={busyAction === "subscriptions"}>
                {busyAction === "subscriptions"
                  ? "Saving..."
                  : editingSubscriptionId
                  ? "Update Subscription"
                  : "Create Subscription"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubscriptionForm(initialSubscriptionForm);
                  setEditingSubscriptionId("");
                }}
              >
                Clear
              </button>
            </div>
          </form>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Package</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No subscriptions found.</td>
                  </tr>
                ) : (
                  subscriptions.map((item) => (
                    <tr key={item._id}>
                      <td>{item.clientName}</td>
                      <td>
                        {typeof item.packageId === "object"
                          ? item.packageId?.name || item.packageId?._id
                          : packageById.get(item.packageId)?.name || item.packageId}
                      </td>
                      <td>
                        <span className={`pill status-${item.status || "active"}`}>
                          {item.status || "active"}
                        </span>
                      </td>
                      <td>{formatDate(item.startDate)}</td>
                      <td>{formatDate(item.endDate)}</td>
                      <td className="actions-inline">
                        <button type="button" onClick={() => handleSubscriptionEdit(item)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleSubscriptionDelete(item._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <div className="panel" style={{ marginTop: "20px" }}>
        <div className="panel-head">
          <h3>AI Package Recommendation</h3>
        </div>
        <form className="form-grid" onSubmit={fetchAiRecommendation}>
          <label>
            <span>Client Name</span>
            <input
              type="text"
              placeholder="Enter client name"
              value={recClientName}
              onChange={(e) => setRecClientName(e.target.value)}
              required
            />
          </label>
          <label>
            <span>Budget ($)</span>
            <input
              type="number"
              placeholder="e.g. 1500"
              value={recBudget}
              onChange={(e) => setRecBudget(e.target.value)}
            />
          </label>
          <label>
            <span>Company Size</span>
            <input
              type="text"
              placeholder="e.g. Small"
              value={recCompanySize}
              onChange={(e) => setRecCompanySize(e.target.value)}
            />
          </label>
          <div className="actions-inline">
            <button type="submit" disabled={isAiLoading}>
              {isAiLoading ? "Analyzing..." : "Ask AI Assistant"}
            </button>
          </div>
        </form>

        {aiRecommendation && (
          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#4f46e5" }}>
              Recommended: {aiRecommendation.packageName} (${aiRecommendation.price})
            </h4>
            <p><strong>Reasoning:</strong> {aiRecommendation.reasoning}</p>
            <p><strong>Expected Benefit:</strong> {aiRecommendation.expectedBenefit}</p>
            {aiRecommendation.alternativePackages && aiRecommendation.alternativePackages.length > 0 && (
              <p><strong>Alternatives:</strong> {aiRecommendation.alternativePackages.join(", ")}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );

  const renderTasks = () => (
    <section className="page-section">
      <div className="panel">
        <div className="panel-head">
          <h3>{editingTaskId ? "Edit Task" : "Create Task"}</h3>
          <div className="view-toggle">
            <button
              type="button"
              className={tasksView === "table" ? "active" : ""}
              onClick={() => setTasksView("table")}
            >
              Table
            </button>
            <button
              type="button"
              className={tasksView === "kanban" ? "active" : ""}
              onClick={() => setTasksView("kanban")}
            >
              Kanban
            </button>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleTaskSubmit}>
          <label>
            <span>Title</span>
            <input
              type="text"
              value={taskForm.title}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              value={taskForm.description}
              onChange={(event) =>
                setTaskForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Assigned To</span>
            <input
              type="text"
              value={taskForm.assignedTo}
              onChange={(event) =>
                setTaskForm((prev) => ({ ...prev, assignedTo: event.target.value }))
              }
              required
            />
          </label>

          <label>
            <span>Status</span>
            <select
              value={taskForm.status}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              {TASK_STATUS_COLUMNS.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Deadline</span>
            <input
              type="date"
              value={taskForm.dueDate}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
          </label>

          <div className="actions-inline">
            <button type="submit" disabled={busyAction === "tasks"}>
              {busyAction === "tasks" ? "Saving..." : editingTaskId ? "Update Task" : "Create Task"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTaskForm(initialTaskForm);
                setEditingTaskId("");
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {tasksView === "table" ? (
        <article className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No tasks available.</td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task._id}>
                      <td>{task.title}</td>
                      <td>
                        <span className={`pill status-${task.status || "pending"}`}>
                          {task.status || "pending"}
                        </span>
                      </td>
                      <td>{formatDate(task.dueDate)}</td>
                      <td>{task.assignedTo || "-"}</td>
                      <td className="actions-inline">
                        <button type="button" onClick={() => handleTaskEdit(task)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleTaskDelete(task._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      ) : (
        <article className="kanban-grid">
          {TASK_STATUS_COLUMNS.map((column) => (
            <div className="kanban-column" key={column.key}>
              <h4>{column.label}</h4>
              {tasks
                .filter((task) => (task.status || "pending") === column.key)
                .map((task) => (
                  <div className="task-card" key={task._id}>
                    <h5>{task.title}</h5>
                    <p>{task.description || "No description"}</p>
                    <div className="task-meta">
                      <span>{task.assignedTo || "Unassigned"}</span>
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                    <div className="actions-inline">
                      <button type="button" onClick={() => handleTaskEdit(task)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleTaskDelete(task._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </article>
      )}
    </section>
  );

  const renderUsers = () => (
    <section className="page-section">
      <article className="panel">
        <div className="panel-head">
          <h3>{editingUserId ? "Edit Staff Member" : "Add Staff Member"}</h3>
        </div>
        <form className="form-grid" onSubmit={handleUserSubmit}>
          <label>
            <span>Name</span>
            <input
              type="text"
              value={userForm.name}
              onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>

          <label>
            <span>Email</span>
            <input
              type="email"
              value={userForm.email}
              onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </label>

          <label>
            <span>Password {editingUserId ? "(leave blank to keep current)" : ""}</span>
            <input
              type="password"
              value={userForm.password}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Role</span>
            <select
              value={userForm.role}
              onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
            >
              {[
                "admin",
                "manager",
                "staff",
              ].map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(userForm.isActive)}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            <span>Active User</span>
          </label>

          <div className="actions-inline">
            <button type="submit" disabled={busyAction === "users"}>
              {busyAction === "users" ? "Saving..." : editingUserId ? "Update User" : "Create User"}
            </button>
            <button
              type="button"
              onClick={() => {
                setUserForm(initialUserForm);
                setEditingUserId("");
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </article>

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5}>No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.isActive ? "Active" : "Inactive"}</td>
                    <td className="actions-inline">
                      <button type="button" onClick={() => handleUserEdit(user)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleUserDelete(user._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );

  const renderPayments = () => (
    <section className="page-section">
      <div className="stats-cards compact">
        <article className="stat-card">
          <p>Current Month Revenue</p>
          <h3>{currency(monthlyRevenue)}</h3>
        </article>
        <article className="stat-card">
          <p>Total Transactions</p>
          <h3>{payments.length}</h3>
        </article>
        <article className="stat-card">
          <p>Paid Records</p>
          <h3>{payments.filter((item) => item.status === "paid").length}</h3>
        </article>
      </div>

      <div className="two-column">
        <article className="panel">
          <div className="panel-head">
            <h3>{editingPaymentId ? "Edit Payment" : "Log Payment"}</h3>
          </div>
          <form className="form-grid" onSubmit={handlePaymentSubmit}>
            <label>
              <span>Client</span>
              <input
                type="text"
                value={paymentForm.clientName}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, clientName: event.target.value }))
                }
                required
              />
            </label>

            <label>
              <span>Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))
                }
                required
              />
            </label>

            <label>
              <span>Payment Date</span>
              <input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, paymentDate: event.target.value }))
                }
              />
            </label>

            <label>
              <span>Method</span>
              <select
                value={paymentForm.method}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, method: event.target.value }))}
              >
                {[
                  "cash",
                  "bank-transfer",
                  "card",
                  "other",
                ].map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Status</span>
              <select
                value={paymentForm.status}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                {[
                  "paid",
                  "pending",
                  "failed",
                  "refunded",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Note</span>
              <textarea
                value={paymentForm.note}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, note: event.target.value }))}
              />
            </label>

            <div className="actions-inline">
              <button type="submit" disabled={busyAction === "payments"}>
                {busyAction === "payments"
                  ? "Saving..."
                  : editingPaymentId
                  ? "Update Payment"
                  : "Log Payment"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentForm(initialPaymentForm);
                  setEditingPaymentId("");
                }}
              >
                Clear
              </button>
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Client Balance Summary</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Total Paid</th>
                </tr>
              </thead>
              <tbody>
                {clientBalanceRows.length === 0 ? (
                  <tr>
                    <td colSpan={2}>No payment records yet.</td>
                  </tr>
                ) : (
                  clientBalanceRows.map((row) => (
                    <tr key={row.clientName}>
                      <td>{row.clientName}</td>
                      <td>{currency(row.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article className="panel">
        <div className="panel-head">
          <h3>Transactions</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6}>No payment entries found.</td>
                </tr>
              ) : (
                payments.map((item) => (
                  <tr key={item._id}>
                    <td>{item.clientName || "-"}</td>
                    <td>{currency(item.amount)}</td>
                    <td>{formatDate(item.paymentDate)}</td>
                    <td>{item.method || "-"}</td>
                    <td>
                      <span className={`pill status-${item.status || "paid"}`}>
                        {item.status || "paid"}
                      </span>
                    </td>
                    <td className="actions-inline">
                      <button type="button" onClick={() => handlePaymentEdit(item)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handlePaymentDelete(item._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );

  const renderPerformance = () => (
    <section className="page-section">
      <article className="panel">
        <div className="panel-head">
          <h3>Filters</h3>
          <button type="button" onClick={exportMetricsCsv}>
            Export Report
          </button>
        </div>

        <div className="filters-row">
          <label>
            <span>Client/Campaign</span>
            <select
              value={performanceFilter.client}
              onChange={(event) =>
                setPerformanceFilter((prev) => ({ ...prev, client: event.target.value }))
              }
            >
              <option value="all">All</option>
              {performanceClientOptions.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Month</span>
            <select
              value={performanceFilter.month}
              onChange={(event) =>
                setPerformanceFilter((prev) => ({ ...prev, month: event.target.value }))
              }
            >
              <option value="all">All</option>
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={String(index + 1)}>
                  {month}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Year</span>
            <select
              value={performanceFilter.year}
              onChange={(event) =>
                setPerformanceFilter((prev) => ({ ...prev, year: event.target.value }))
              }
            >
              {["all", ...new Set(metrics.map((item) => String(new Date(item.recordedAt || item.createdAt || Date.now()).getFullYear())))]
                .filter(Boolean)
                .sort()
                .map((year) => (
                  <option key={year} value={year}>
                    {year === "all" ? "All" : year}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </article>

      <div className="stats-cards compact">
        <article className="stat-card">
          <p>Reach</p>
          <h3>{performanceCards.reach.toLocaleString()}</h3>
        </article>
        <article className="stat-card">
          <p>Impressions</p>
          <h3>{performanceCards.impressions.toLocaleString()}</h3>
        </article>
        <article className="stat-card">
          <p>Engagement Rate</p>
          <h3>{performanceCards.engagement.toFixed(2)}%</h3>
        </article>
      </div>

      <div className="two-column">
        <article className="panel">
          <div className="panel-head">
            <h3>Reach vs Impressions</h3>
          </div>
          <PerformanceLineChart data={performanceTrendData} />
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Monthly Revenue</h3>
          </div>
          <SimpleBarChart
            data={revenueTrendData}
            valueKey="value"
            labelKey="label"
            colorClass="dark"
            formatter={(value) => currency(value)}
          />
        </article>
      </div>

      <div className="two-column">
        <article className="panel">
          <div className="panel-head">
            <h3>{editingMetricId ? "Edit Metric" : "Log Metric"}</h3>
          </div>
          <form className="form-grid" onSubmit={handleMetricSubmit}>
            <label>
              <span>Client/Campaign</span>
              <input
                type="text"
                value={metricForm.campaignName}
                onChange={(event) =>
                  setMetricForm((prev) => ({ ...prev, campaignName: event.target.value }))
                }
                required
              />
            </label>

            <label>
              <span>Platform</span>
              <input
                type="text"
                value={metricForm.platform}
                onChange={(event) =>
                  setMetricForm((prev) => ({ ...prev, platform: event.target.value }))
                }
                required
              />
            </label>

            <label>
              <span>Reach</span>
              <input
                type="number"
                min="0"
                value={metricForm.reach}
                onChange={(event) => setMetricForm((prev) => ({ ...prev, reach: event.target.value }))}
              />
            </label>

            <label>
              <span>Impressions</span>
              <input
                type="number"
                min="0"
                value={metricForm.impressions}
                onChange={(event) =>
                  setMetricForm((prev) => ({ ...prev, impressions: event.target.value }))
                }
              />
            </label>

            <label>
              <span>Engagement (%)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={metricForm.engagement}
                onChange={(event) =>
                  setMetricForm((prev) => ({ ...prev, engagement: event.target.value }))
                }
              />
            </label>

            <label>
              <span>Leads</span>
              <input
                type="number"
                min="0"
                value={metricForm.leads}
                onChange={(event) => setMetricForm((prev) => ({ ...prev, leads: event.target.value }))}
              />
            </label>

            <label>
              <span>Recorded Date</span>
              <input
                type="date"
                value={metricForm.recordedAt}
                onChange={(event) =>
                  setMetricForm((prev) => ({ ...prev, recordedAt: event.target.value }))
                }
              />
            </label>

            <div className="actions-inline">
              <button type="submit" disabled={busyAction === "metrics"}>
                {busyAction === "metrics" ? "Saving..." : editingMetricId ? "Update Metric" : "Add Metric"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMetricForm(initialMetricForm);
                  setEditingMetricId("");
                }}
              >
                Clear
              </button>
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Metric Entries</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client/Campaign</th>
                  <th>Month</th>
                  <th>Reach</th>
                  <th>Impressions</th>
                  <th>Engagement</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No metrics for selected filters.</td>
                  </tr>
                ) : (
                  filteredMetrics.map((item) => (
                    <tr key={item._id}>
                      <td>{item.campaignName || "-"}</td>
                      <td>{formatDate(item.recordedAt)}</td>
                      <td>{safeNumber(item.reach).toLocaleString()}</td>
                      <td>{safeNumber(item.impressions).toLocaleString()}</td>
                      <td>{safeNumber(item.engagement).toFixed(2)}%</td>
                      <td className="actions-inline">
                        <button type="button" onClick={() => handleMetricEdit(item)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleMetricDelete(item._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );

  const renderSettings = () => (
    <section className="page-section">
      <article className="panel">
        <div className="panel-head">
          <h3>System Settings</h3>
        </div>
        <div className="settings-grid">
          <div>
            <span>Frontend Environment</span>
            <strong>React (CRA)</strong>
          </div>
          <div>
            <span>Connected API</span>
            <strong>{API_BASE_URL}</strong>
          </div>
          <div>
            <span>Theme Palette</span>
            <strong>Black / Gold / White</strong>
          </div>
          <div>
            <span>Client Module</span>
            <strong>Uses local storage until backend endpoint is added</strong>
          </div>
        </div>
        <div className="actions-inline">
          <button type="button" onClick={handleRefreshAll}>
            Re-sync API Data
          </button>
        </div>
      </article>
    </section>
  );

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return renderDashboard();
      case "clients":
        return renderClients();
      case "packages":
        return renderPackagesAndSubscriptions();
      case "tasks":
        return renderTasks();
      case "users":
        return currentUser?.role === "staff" ? renderDashboard() : renderUsers();
      case "payments":
        return renderPayments();
      case "performance":
        return renderPerformance();
      case "settings":
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  if (!authToken) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="brand">
            <p>SPARKLENZ</p>
            <h1>Agency OS</h1>
          </div>
          <h2>{authMode === "login" ? "Login" : "Create Account"}</h2>
          <p className="auth-subtitle">
            {authMode === "login"
              ? "Sign in with your backend user account to continue."
              : "Register a new account using the backend /api/users/register endpoint."}
          </p>

          <div className="auth-switch">
            <span>
              {authMode === "login"
                ? "Need an account?"
                : "Already have an account?"}
            </span>
            <button
              type="button"
              onClick={() => {
                clearMessages();
                setAuthMode((prev) => (prev === "login" ? "register" : "login"));
              }}
            >
              {authMode === "login" ? "Register" : "Back to Login"}
            </button>
          </div>

          {authMode === "login" ? (
            <form className="form-grid" onSubmit={handleLoginSubmit}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </label>

              <div className="auth-actions">
                <button className="auth-submit" type="submit" disabled={authBusy}>
                  {authBusy ? "Signing in..." : "Sign In"}
                </button>
              </div>
            </form>
          ) : (
            <form className="form-grid" onSubmit={handleRegisterSubmit}>
              <label>
                <span>Name</span>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Your full name"
                  autoComplete="name"
                  minLength={2}
                  required
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                <span>Role</span>
                <select
                  value={registerForm.role}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, role: event.target.value }))
                  }
                >
                  <option value="staff">staff</option>
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                </select>
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </label>

              <label>
                <span>Confirm Password</span>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                  }
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </label>

              <div className="auth-actions">
                <button className="auth-submit" type="submit" disabled={authBusy}>
                  {authBusy ? "Creating account..." : "Create Account"}
                </button>
              </div>
            </form>
          )}
        </div>

        {error ? <div className="message err auth-message">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="spark-app">
      <div className="background-shape background-a" />
      <div className="background-shape background-b" />

      <aside className="sidebar">
        <div className="brand">
          <p>SPARKLENZ</p>
          <h1>Agency OS</h1>
        </div>

        <nav>
          {visibleNavItems.map((item) => (
            <button
              type="button"
              key={item.key}
              className={item.key === activePage ? "active" : ""}
              onClick={() => goTo(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <small>Signed In</small>
          <p>{currentUser?.name || currentUser?.email || "Unknown user"}</p>
          <small className="role-chip">{currentUser?.role || "staff"}</small>
          <button type="button" onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Sparklenz Management Platform</p>
            <h2>{currentTitle}</h2>
          </div>
          <div className="topbar-actions">
            <span>{currentUser?.email || ""}</span>
            <button type="button" onClick={handleRefreshAll} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </header>

        {notice ? <div className="message ok">{notice}</div> : null}
        {error ? <div className="message err">{error}</div> : null}

        {renderContent()}
      </main>

      {showClientModal ? (
        <div className="modal-overlay" onClick={() => setShowClientModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-head">
              <h3>{clientForm.id ? "Edit Client" : "Add Client"}</h3>
            </div>

            <form className="form-grid" onSubmit={handleClientSave}>
              <label>
                <span>Name</span>
                <input
                  type="text"
                  value={clientForm.name}
                  onChange={(event) => setClientForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={clientForm.email}
                  onChange={(event) =>
                    setClientForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </label>

              <label>
                <span>Company</span>
                <input
                  type="text"
                  value={clientForm.company}
                  onChange={(event) =>
                    setClientForm((prev) => ({ ...prev, company: event.target.value }))
                  }
                />
              </label>

              <label>
                <span>Package</span>
                <select
                  value={clientForm.packageId}
                  onChange={(event) =>
                    setClientForm((prev) => ({ ...prev, packageId: event.target.value }))
                  }
                >
                  <option value="">None</option>
                  {packages.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status</span>
                <select
                  value={clientForm.status}
                  onChange={(event) =>
                    setClientForm((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  {[
                    "active",
                    "pending",
                    "cancelled",
                    "paused",
                  ].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <div className="actions-inline">
                <button type="submit">Save Client</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowClientModal(false);
                    setClientForm(initialClientForm);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
