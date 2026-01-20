import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../services/api";

export default function EditParent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    ghana_card_number: "",
    address: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api(`/parents/${id}`);
        setForm(data.parent);
      } catch {
        setError("Failed to load parent record");
      }
    };
    load();
  }, [id]);

  const update = (k) => (e) =>
    setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    try {
      await api(`/parents/${id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      navigate("/parents");
    } catch {
      setError("Failed to update parent");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this parent permanently?")) return;
    try {
      await api(`/parents/${id}`, { method: "DELETE" });
      navigate("/parents");
    } catch {
      setError("Failed to delete parent");
    }
  };

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2>Modify Parent</h2>

      {error && <div className="danger">{error}</div>}

      <input
        className="input"
        placeholder="Full Name"
        value={form.full_name}
        onChange={update("full_name")}
      />
      <input
        className="input"
        placeholder="Phone"
        value={form.phone}
        onChange={update("phone")}
      />
      <input
        className="input"
        placeholder="Ghana Card Number"
        value={form.ghana_card_number}
        onChange={update("ghana_card_number")}
      />
      <input
        className="input"
        placeholder="Address"
        value={form.address}
        onChange={update("address")}
      />

      <div className="form-actions">
        <button className="btn btn-primary" onClick={save}>
          Save Changes
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/parents")}
        >
          Cancel
        </button>
        <button className="btn btn-danger" onClick={remove}>
          Delete Parent
        </button>
      </div>
    </div>
  );
}
