import React, { useState } from "react";

function Profile() {
  const [profile, setProfile] = useState({
    name: "",
    age: "",
    sex: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Profile Saved!\nName: ${profile.name}\nAge: ${profile.age}\nSex: ${profile.sex}`);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>User Profile</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>Name:</label>
        <input
          type="text"
          name="name"
          value={profile.name}
          onChange={handleChange}
          style={styles.input}
          placeholder="Enter full name"
          required
        />

        <label style={styles.label}>Age:</label>
        <input
          type="number"
          name="age"
          value={profile.age}
          onChange={handleChange}
          style={styles.input}
          placeholder="Enter age"
          min="0"
          required
        />

        <label style={styles.label}>Sex:</label>
        <select
          name="sex"
          value={profile.sex}
          onChange={handleChange}
          style={styles.input}
          required
        >
          <option value="">Select</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        <button type="submit" style={styles.button}>Save Profile</button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    maxWidth: "400px",
    margin: "50px auto",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
    backgroundColor: "#fff",
    fontFamily: "Arial, sans-serif",
  },
  heading: {
    textAlign: "center",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    marginBottom: "5px",
    fontWeight: "bold",
  },
  input: {
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  button: {
    padding: "10px",
    border: "none",
    borderRadius: "5px",
    backgroundColor: "#007bff",
    color: "white",
    fontSize: "16px",
    cursor: "pointer",
  },
};

export default Profile;
