import React, { useEffect, useState } from "react";
import axios from "axios";

const Dashboard = () => {
  const [tracingLogs, setTracingLogs] = useState([]);
  const [performanceStats, setPerformanceStats] = useState([]);

  // ✅ Utility to format datetime with milliseconds
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
      hour12: true,
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const logs = await axios.get("http://localhost:8000/api/request-logs");
        const perf = await axios.get(
          "http://localhost:8000/api/performance-stats"
        );

        setTracingLogs(logs.data);
        setPerformanceStats(perf.data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "30px",
        fontFamily: "Segoe UI, sans-serif",
        background: "linear-gradient(135deg, #74ebd5 0%, #9face6 100%)",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          marginBottom: "30px",
          fontSize: "2rem",
          color: "#fff",
          textShadow: "1px 1px 4px rgba(0,0,0,0.4)",
        }}
      >
         Dashboard
      </h2>

      {/* Performance Stats */}
<div
  style={{
    background: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "30px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  }}
>
  <h3 style={{ marginBottom: "15px", color: "#007bff" }}>
     Performance Load
  </h3>
  <div style={{ overflowX: "auto" }}>
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <thead style={{ background: "#007bff", color: "white" }}>
        <tr>
          <th style={{ padding: "12px" }}>Endpoint</th>
          <th style={{ padding: "12px" }}>Method</th>
          <th style={{ padding: "12px" }}>Status</th> {/* ✅ New */}
          <th style={{ padding: "12px" }}>Avg Response Time (ms)</th>
          <th style={{ padding: "12px" }}>Total Requests</th>
        </tr>
      </thead>
      <tbody>
        {performanceStats.map((stat, idx) => (
          <tr
            key={idx}
            style={{
              background: idx % 2 === 0 ? "#f1f5ff" : "#fff",
              textAlign: "center",
              transition: "background 0.3s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e6f0ff")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                idx % 2 === 0 ? "#f1f5ff" : "#fff")
            }
          >
            <td style={{ padding: "10px" }}>{stat.endpoint}</td>
            <td style={{ padding: "10px" }}>{stat.method}</td>
            <td style={{ padding: "10px" }}>{stat.status}</td> {/* ✅ New */}
            <td style={{ padding: "10px" }}>{stat.avg_response_time}</td>
            <td style={{ padding: "10px" }}>{stat.total_requests}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

      {/* Tracing Logs */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <h3 style={{ marginBottom: "15px", color: "#28a745" }}> Tracing Logs</h3>
        <div style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <thead style={{ background: "#28a745", color: "white" }}>
              <tr>
                <th style={{ padding: "12px" }}>IP Address</th>
                <th style={{ padding: "12px" }}>User Agent</th>
                <th style={{ padding: "12px" }}>Endpoint</th>
                <th style={{ padding: "12px" }}>Method</th>
                <th style={{ padding: "12px" }}>Entry Time</th>
                <th style={{ padding: "12px" }}>Exit Time</th>
              </tr>
            </thead>
            <tbody>
              {tracingLogs.map((log, idx) => (
                <tr
                  key={log.id}
                  style={{
                    background: idx % 2 === 0 ? "#f9fff9" : "#fff",
                    textAlign: "center",
                    transition: "background 0.3s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#e6ffe6")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      idx % 2 === 0 ? "#f9fff9" : "#fff")
                  }
                >
                  <td style={{ padding: "10px" }}>{log.ip_address}</td>
                  <td style={{ padding: "10px", maxWidth: "250px" }}>
                    {log.user_agent}
                  </td>
                  <td style={{ padding: "10px" }}>{log.endpoint}</td>
                  <td style={{ padding: "10px" }}>{log.method}</td>
                  <td style={{ padding: "10px" }}>
                    {formatDateTime(log.entry_time)}
                  </td>
                  <td style={{ padding: "10px" }}>
                    {formatDateTime(log.exit_time)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;