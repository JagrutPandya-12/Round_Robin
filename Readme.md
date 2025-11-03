# 🧮 Round Robin CPU Scheduling Visualizer

An interactive **web-based visualizer** for the **Round Robin CPU Scheduling Algorithm**.  
This tool helps users understand how processes are scheduled in a time-shared operating system.

---

## ⚙️ Features

- Add or remove processes dynamically  
- Adjustable **Time Quantum (ms)**  
- Real-time **Gantt Chart** visualization  
- Highlights the currently active process  
- Displays **Average Waiting Time**, **Turnaround Time**, and **Total CPU Time**  
- Export options:
  - 💾 Screenshot of the visualization (PNG)
  - 📜 Execution trace (JSON)
- Works entirely offline (no server required)

---

## 🧱 Project Structure

| **File** | **Description** |
|-----------|----------------|
| `index.html` | Contains the web layout and UI structure. |
| `style.css` | Defines all colors, fonts, and design layout. |
| `script.js` | Implements the Round Robin algorithm, canvas animation, and event handling. |
| `README.md` | Project description and usage instructions. |

---

## 🚀 How to Use

1) **Setup:**  
   Save this file as `index.html` and open it in any modern browser. No server required.

2) **Inputs:**  
   Add processes using the Name and Burst fields. Default arrival = 0.  
   Set the Time Quantum (ms). Use **Random** to quickly add sample processes.

3) **Controls:**  
   Play/Pause to animate. Step forward/backward to move between segments.  
   Speed slider controls animation speed.

4) **Visualization:**  
   Canvas shows a circular queue of process blocks and a Gantt-like timeline.  
   Active process is highlighted and remaining bursts update in real-time.

5) **Export:**  
   Save Screenshot to capture canvas; Save Trace downloads execution trace as JSON for submission.

---

## 👨‍💻 Author

**Jagrut Pandya**  
VIT University — Operating Systems Project  
*Course: BCSE303L — Operating Systems*

---

## 📄 License

This project is created for **educational purposes** and academic submission only.  
You may modify or share it with proper credit.

