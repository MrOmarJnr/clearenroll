import { useState } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function AddParent() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    ghana_card_number: "",
    address: "",
  });
  const [error, setError] = useState("");

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api("/parents", {
        method: "POST",
        body: JSON.stringify(form),
      });
      navigate("/parents");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2>Add Parent</h2>
    
      {error && <div className="danger">{error}</div>}

      <form onSubmit={submit}>
        <div className="form-row">
          <input className="input" placeholder="Full Name" value={form.full_name} onChange={onChange("full_name")} required />
        </div>
        <div className="form-row">
          <input className="input" placeholder="Phone" value={form.phone} onChange={onChange("phone")} required />
        </div>
        <div className="form-row">
          <input className="input" placeholder="Ghana Card Number" value={form.ghana_card_number} onChange={onChange("ghana_card_number")} />
        </div>
        <div className="form-row">
          <input className="input" placeholder="Address" value={form.address} onChange={onChange("address")} />
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">Save</button>
          <button className="btn" type="button" onClick={() => navigate("/parents")}>Cancel</button>
                <button className="btn" onClick={() => navigate("/parents/import")}>
  Bulk Import Parents
</button>
      
        </div>
      </form>
    </div>
  );
}
