import "./App.css";
import { useEffect, useState } from "react";

const API = "http://localhost:4000/api";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [members, setMembers] = useState([]);
  const [name, setName] = useState("");
  const [participants, setParticipants] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [settlement, setSettlement] = useState(null);
  const [payer, setPayer] = useState("");
  const [splitType, setSplitType] = useState("equal");
  const [exactValues, setExactValues] = useState({});
  const [percentValues, setPercentValues] = useState({});
  
  useEffect(() => {
    if (!workspaceId) return;
    loadMembers();
    loadExpenses();
  }, [workspaceId]);
  
async function login() {
  if (!email.trim() || !password.trim()) {
  alert("Email and password are required");
  return;
}
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Login failed");
    return;
  }

  setCurrentUser(data);
  setWorkspaceId(data.workspace_id);
}


async function register() {
  if (!email.trim() || !password.trim()) {
  alert("Email and password are required");
  return;
}
if (!email.includes("@")) {
  alert("Enter a valid email");
  return;
}
  const res = await fetch(`${API}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: email.split("@")[0],
      email: email.trim(),
      password
    })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Registration failed");
    return;
  }

  setCurrentUser(data);
  setWorkspaceId(data.workspace_id);
}

function logout() {
  setCurrentUser(null);
  setWorkspaceId(null);

  // cleanup app state
  setMembers([]);
  setExpenses([]);
  setParticipants([]);
  setSettlement(null);
  setEmail("");
  setPassword("");
}



  async function loadMembers() {
    const res = await fetch(
      `${API}/members?workspace_id=${workspaceId}`
    );
    const data = await res.json();
    setMembers(data);
  }
  async function loadExpenses() {
  const res = await fetch(
    `${API}/expenses?workspace_id=${workspaceId}`
  );
  const data = await res.json();
  setExpenses(data);
}

  async function addMember() {
    if (!name.trim()) return;

    await fetch(`${API}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        workspace_id: workspaceId
      })
    });

    setName("");
    loadMembers();
  }
  async function deleteMember(id) {
  const ok = window.confirm("Delete this participant?");
  if (!ok) return;

  const res = await fetch(`${API}/members/${id}`, {
    method: "DELETE"
  });

  if (!res.ok) {
    const data = await res.json();
    alert(data.error || "Cannot delete member");
    return;
  }

  // cleanup UI state
  setParticipants(prev => prev.filter(p => p !== id));
  loadMembers();
}


  function toggleParticipant(id) {
  setParticipants(prev =>
    prev.includes(id)
      ? prev.filter(p => p !== id)
      : [...prev, id]
  );
}
  async function addExpense() {
 
  if (!title.trim()) return alert("Enter title");
  if (!amount || isNaN(amount)) return alert("Enter valid amount");
  if (participants.length === 0) return alert("Select participants");
  if (!payer) return alert("Select who paid"); 
  let shares = [];

if (splitType === "equal") {
  const perPerson = Number(amount) / participants.length;
  shares = participants.map(id => ({
    member_id: id,
    share_amount: perPerson
  }));
}

if (splitType === "exact") {
  const total = Object.values(exactValues).reduce((a, b) => a + b, 0);

  if (total !== Number(amount)) {
    alert("Exact amounts must sum to total");
    return;
  }

  shares = participants.map(id => ({
    member_id: id,
    share_amount: exactValues[id] || 0
  }));
}
if (splitType === "percent") {
  const totalPercent = Object.values(percentValues)
    .reduce((a, b) => a + b, 0);

  if (totalPercent !== 100) {
    alert("Percentages must sum to 100");
    return;
  }

  shares = participants.map(id => ({
    member_id: id,
    share_amount: (Number(amount) * (percentValues[id] || 0)) / 100
  }));
}


  await fetch(`${API}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      amount: Number(amount),
      payer_member_id: payer, 
      shares,
      workspace_id: workspaceId
    })
  });

  setTitle("");
  setAmount("");
  setParticipants([]);
  setPayer("");
  setExactValues({});
  setSplitType("equal");
  setPercentValues({});
  loadExpenses();
  setSettlement(null);
}
async function deleteExpense(id) {
  const ok = window.confirm("Delete this expense?");
  if (!ok) return;

  await fetch(`${API}/expenses/${id}`, {
    method: "DELETE"
  });

  loadExpenses();
  setSettlement(null); // reset settlement
}


async function computeSettlement() {
  const res = await fetch(
    `${API}/settle?workspace_id=${workspaceId}`
  );
  const data = await res.json();
  setSettlement(data);
}
function buildTransfers(settlement) {
  const receivers = [];
  const payers = [];

  Object.entries(settlement).forEach(([id, amt]) => {
    const value = Number(amt);
    if (value > 0) receivers.push({ id: Number(id), amt: value });
    if (value < 0) payers.push({ id: Number(id), amt: -value });
  });

  const transfers = [];
  let i = 0, j = 0;

  while (i < payers.length && j < receivers.length) {
    const pay = Math.min(payers[i].amt, receivers[j].amt);

    transfers.push({
      from: payers[i].id,
      to: receivers[j].id,
      amount: pay
    });

    payers[i].amt -= pay;
    receivers[j].amt -= pay;

    if (payers[i].amt === 0) i++;
    if (receivers[j].amt === 0) j++;
  }

  return transfers;
}
if (!currentUser) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Expense Splitter</h1>

        <input
          className="auth-input"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button
  type="button"
  className="auth-btn primary"
  onClick={login}
>
  Login
</button>


        <button
  type="button"
  className="auth-btn outline"
  onClick={register}
>
  Register
</button>

      </div>
    </div>
  );
}


  return (
    <>
    <div className="top-bar">
      <span className="welcome-text">
        Hi, {currentUser.name}
      </span>

      <button className="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
    {/*people*/}
    <div className="section-box people-box" style={{ padding: 20 }}>
      <h2 className="section-title">People</h2>

      <input
        placeholder="Add person"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button onClick={addMember}>Add</button>

     <ul>
  {members.map(m => (
    <li key={m.id} style={{ display: "flex", gap: 8 }}>
      <label>
        <input
          type="checkbox"
          checked={participants.includes(m.id)}
          onChange={() => toggleParticipant(m.id)}
        />
        {" "}{m.name}
      </label>

      <button className={"delete-btn"}
        onClick={() => deleteMember(m.id)}
        style={{ color: "red" }}
      >
        ✕
      </button>
    </li>
  ))}
</ul>
</div>

<div className="section-box expense-box">
<h2 className="section-title">Create Expense</h2>
<select
  value={splitType}
  onChange={e => {
    setSplitType(e.target.value);
    setExactValues({});
    setPercentValues({});
  }}
>
  <option value="equal">Equal</option>
  <option value="exact">Exact</option>
  <option value="percent">Percent</option>
</select>


<select
  value={payer}
  onChange={e => setPayer(Number(e.target.value))}
>
  <option value="">Who paid?</option>
  {participants.map(id => {
    const person = members.find(m => m.id === id);
    return (
      <option key={id} value={id}>
        {person?.name}
      </option>
    );
  })}
</select>
{splitType === "exact" && (
  <div>
    {participants.map(id => {
      const person = members.find(m => m.id === id);
      return (
        <div key={id}>
          {person?.name}
          <input
            type="number"
            placeholder="Amount"
            value={exactValues[id] || ""}
            onChange={e =>
              setExactValues(prev => ({
                ...prev,
                [id]: Number(e.target.value)
              }))
            }
          />
        </div>
      );
    })}
  </div>
)}
{splitType === "percent" && (
  <div>
    {participants.map(id => {
      const person = members.find(m => m.id === id);
      return (
        <div key={id}>
          {person?.name}
          <input
            type="number"
            placeholder="%"
            value={percentValues[id] || ""}
            onChange={e =>
              setPercentValues(prev => ({
                ...prev,
                [id]: Number(e.target.value)
              }))
            }
          />
        </div>
      );
    })}
  </div>
)}


<label>
<input
  placeholder="Title"
  value={title}
  onChange={e => setTitle(e.target.value)}
/>
</label>

<input
  placeholder="Amount"
  type="number"
  value={amount}
  onChange={e => setAmount(e.target.value)}
/>

<button
  onClick={addExpense}
  disabled={
    !title.trim() ||
    !amount ||
    participants.length === 0 ||
    !payer ||
    (splitType === "exact" &&
      Object.values(exactValues).reduce((a, b) => a + b, 0) !== Number(amount)) ||
    (splitType === "percent" &&
      Object.values(percentValues).reduce((a, b) => a + b, 0) !== 100)
  }
>
  Add Expense
</button>

</div>

<div className="section-box expense-box">
<h2 className="section-title">All Expenses</h2>

<ul>
  {expenses.map(e => (
    <li key={e.id} style={{ display: "flex", gap: 8 }}>
      {e.title} — ₹{e.amount}
      <button className={"delete-btn"}
        onClick={() => deleteExpense(e.id)}
        style={{ color: "red" }}
      >
        ✕
      </button>
    </li>
  ))}
</ul>
</div>
<div className="section-box settle-box">
<h2 className="section-title">Settle Up</h2>
<button onClick={computeSettlement}>Compute Settlement</button>

{settlement && (
  <div>
    <h3>Who pays whom</h3>

    {buildTransfers(settlement).length === 0 && (
      <div>Everyone is settled</div>
    )}

    <ul>
      {buildTransfers(settlement).map((t, index) => {
        const from = members.find(m => m.id === t.from);
        const to = members.find(m => m.id === t.to);

        return (
          <li key={index}>
            {from?.name} pays {to?.name} ₹{t.amount}
          </li>
        );
      })}
    </ul>
  </div>
)}

 </div>
 </>
  );
}
