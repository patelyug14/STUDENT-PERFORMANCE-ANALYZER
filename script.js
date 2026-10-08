let students = [];
let division = "All";
let subjectPoints = [];
let studentPoints = [];
let failedPoints = [];
let editingId = null;
const $ = id => document.getElementById(id);

async function loadData() {
    try {
        $("message").textContent = "Loading...";
        const { data, error } = await db
            .from("students")
            .select("*")
            .order("division")
            .order("roll");
        if (error) throw error;
        students = data || [];
        $("message").textContent = "Connected to Database";
        refresh();
    } catch (error) {
        console.error(error);
        $("message").textContent = "Database Error";
        alert("Database Error:\n\n" + error.message);
    }
}

function changeDivision(value, button) {
    division = value;
    document.querySelectorAll(".division").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    const title = value === "All" ? "All Divisions" : "Division " + value;
    ["divisionTitle", "graphDivision", "tableDivision"].forEach(id => $(id).textContent = title);
    if (value !== "All") $("addDivision").value = value;
    clearSearch();
    refresh();
}

function divisionStudents() {
    return division === "All" ? students : students.filter(s => s.division === division);
}

function percentage(s) {
    return (+s.maths + +s.science + +s.english) / 3;
}

function grade(p) {
    if (p >= 80) return "A";
    if (p >= 70) return "B";
    if (p >= 60) return "C";
    if (p >= 50) return "D";
    return "F";
}

function resultStatus(p) {
    return p >= 50 ? "Passed" : "Failed";
}

function esc(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showStudents(list) {
    const table = $("studentTable");
    if (!list.length) {
        table.innerHTML = "<tr><td colspan='10'>No student found</td></tr>";
        return;
    }

    table.innerHTML = list.map(s => {
        const p = percentage(s);
        const g = grade(p);
        const failed = g === "F";
        return `<tr class="${failed ? "failed-row" : ""}">
            <td>${esc(s.name)}</td>
            <td>${esc(s.roll)}</td>
            <td>${esc(s.division)}</td>
            <td>${s.maths}</td><td>${s.science}</td><td>${s.english}</td>
            <td>${p.toFixed(1)}%</td>
            <td class="grade-${g.toLowerCase()}">${g}</td>
            <td><span class="status-badge ${failed ? "failed" : "passed"}">${resultStatus(p)}</span></td>
            <td class="action-cell">
                <button class="update" onclick="updateStudent(${s.id})">Edit</button>
                <button class="delete" onclick="deleteStudent(${s.id})">Delete</button>
            </td>
        </tr>`;
    }).join("");
}

function calculateData(list) {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let best = null;
    let worst = null;

    list.forEach(s => {
        const p = percentage(s);
        total += p;
        if (p >= 50) passed++; else failed++;
        if (!best || p > percentage(best)) best = s;
        if (!worst || p < percentage(worst)) worst = s;
    });

    const avg = list.length ? total / list.length : 0;
    const high = best ? percentage(best) : 0;
    const low = worst ? percentage(worst) : 0;
    const pass = list.length ? passed * 100 / list.length : 0;
    const fail = list.length ? failed * 100 / list.length : 0;

    $("average").textContent = avg.toFixed(1) + "%";
    $("highest").textContent = high.toFixed(1) + "%";
    $("lowest").textContent = low.toFixed(1) + "%";
    $("pass").textContent = pass.toFixed(1) + "%";
    $("failed").textContent = failed;
    $("divisionCount").textContent = list.length;

    $("averageDetail").textContent = "Average of " + list.length + " students";
    $("highestDetail").textContent = best ? best.name + " • " + best.roll : "No data";
    $("lowestDetail").textContent = worst ? worst.name + " • " + worst.roll : "No data";
    $("passDetail").textContent = passed + " of " + list.length + " passed";
    $("failedDetail").textContent = failed + " below 50% average";

    $("averageInfo").innerHTML = "Average: " + avg.toFixed(1) + "%<br>Students: " + list.length;
    $("highestInfo").innerHTML = best ? "Name: " + best.name + "<br>Roll: " + best.roll + "<br>Division: " + best.division + "<br>Score: " + high.toFixed(1) + "%" : "No data";
    $("lowestInfo").innerHTML = worst ? "Name: " + worst.name + "<br>Roll: " + worst.roll + "<br>Division: " + worst.division + "<br>Score: " + low.toFixed(1) + "%" : "No data";
    $("passInfo").innerHTML = "Passed: " + passed + "<br>Failed: " + failed + "<br>Pass Rate: " + pass.toFixed(1) + "%";
    $("failedInfo").innerHTML = "Failed: " + failed + "<br>Failure Rate: " + fail.toFixed(1) + "%<br>Rule: Average below 50%";
}

function readForm(prefix = "") {
    const get = id => $(prefix + id).value;
    return {
        name: get("Name").trim(),
        roll: get("Roll").trim(),
        division: get("Division"),
        maths: +get("Maths"),
        science: +get("Science"),
        english: +get("English")
    };
}

function validMarks(s) {
    return s.name && s.roll && [s.maths, s.science, s.english].every(v => Number.isFinite(v) && v >= 0 && v <= 100);
}

async function addStudent() {
    const student = {
        name: $("name").value.trim(),
        roll: $("roll").value.trim(),
        division: $("addDivision").value,
        maths: +$("maths").value,
        science: +$("science").value,
        english: +$("english").value
    };

    if (!validMarks(student)) {
        alert("Please enter valid student details and marks from 0 to 100.");
        return;
    }
    if (students.some(s => s.roll === student.roll)) {
        alert("Roll number already exists.");
        return;
    }

    const { error } = await db.from("students").insert([student]);
    if (error) {
        alert("Student could not be added.\n\n" + error.message);
        return;
    }
    clearForm();
    await loadData();
}

function updateStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) return alert("Student record not found.");
    editingId = id;
    $("editName").value = student.name;
    $("editRoll").value = student.roll;
    $("editDivision").value = student.division;
    $("editMaths").value = student.maths;
    $("editScience").value = student.science;
    $("editEnglish").value = student.english;
    updateEditPreview();
    $("updateModal").classList.add("show");
}

function closeUpdateModal() {
    editingId = null;
    $("updateModal").classList.remove("show");
}

function updateEditPreview() {
    const maths = +$("editMaths").value || 0;
    const science = +$("editScience").value || 0;
    const english = +$("editEnglish").value || 0;
    const p = (maths + science + english) / 3;
    const g = grade(p);
    $("editResultPreview").textContent = p.toFixed(1) + "%";
    $("editGradePreview").textContent = "Grade " + g;
    $("editGradePreview").className = "grade-preview grade-" + g.toLowerCase();
}

async function saveStudentUpdate() {
    if (editingId === null) return;
    const student = {
        name: $("editName").value.trim(),
        roll: $("editRoll").value.trim(),
        division: $("editDivision").value,
        maths: +$("editMaths").value,
        science: +$("editScience").value,
        english: +$("editEnglish").value
    };

    if (!validMarks(student)) {
        alert("Please enter valid student details and marks from 0 to 100.");
        return;
    }
    if (students.some(s => s.roll === student.roll && s.id !== editingId)) {
        alert("Roll number already exists for another student.");
        return;
    }

    const { error } = await db.from("students").update(student).eq("id", editingId);
    if (error) {
        alert("Student could not be updated.\n\n" + error.message);
        return;
    }
    closeUpdateModal();
    await loadData();
}

async function deleteStudent(id) {
    if (!confirm("Delete this student?")) return;
    const { error } = await db.from("students").delete().eq("id", id);
    if (error) {
        alert("Student could not be deleted.\n\n" + error.message);
        return;
    }
    await loadData();
}

function clearForm() {
    ["name", "roll", "maths", "science", "english"].forEach(id => $(id).value = "");
}

function clearSearch() {
    $("search").value = "";
    $("gradeFilter").value = "All";
}

function filterStudents() {
    const q = $("search").value.toLowerCase();
    const selected = $("gradeFilter").value;
    const list = divisionStudents().filter(s => {
        const match = s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q);
        const matchGrade = selected === "All" || grade(percentage(s)) === selected;
        return match && matchGrade;
    });
    showStudents(list);
}

/* ---------------- Graphs ---------------- */
function setupCanvas(canvas, minimumWidth = 620, height = 310) {
    const parentWidth = Math.max(canvas.parentElement.clientWidth, minimumWidth);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = parentWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = parentWidth + "px";
    canvas.style.height = height + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, parentWidth, height);
    return { ctx, width: parentWidth, height };
}

function chartTheme(ctx) {
    ctx.font = "11px Arial";
    ctx.lineWidth = 1;
}

function drawYAxis(ctx, left, top, right, bottom) {
    chartTheme(ctx);
    const chartH = bottom - top;
    for (let i = 0; i <= 5; i++) {
        const value = 100 - i * 20;
        const y = top + chartH * i / 5;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.strokeStyle = "#e8e5df";
        ctx.stroke();
        ctx.fillStyle = "#7c817f";
        ctx.textAlign = "right";
        ctx.fillText(value, left - 9, y + 4);
    }
    ctx.textAlign = "left";
}

function drawPassLine(ctx, left, right, top, bottom) {
    const y = top + (bottom - top) * .5;
    ctx.beginPath();
    ctx.setLineDash([6, 5]);
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.strokeStyle = "#b5833a";
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#9d6d24";
    ctx.font = "bold 11px Arial";
    ctx.fillText("Pass 50", right - 52, y - 7);
}

function drawSubjectGraph(list) {
    const canvas = $("subjectGraph");
    const { ctx, width, height } = setupCanvas(canvas, 620, 310);
    const left = 58, right = width - 22, top = 24, bottom = height - 52;
    drawYAxis(ctx, left, top, right, bottom);
    drawPassLine(ctx, left, right, top, bottom);
    subjectPoints = [];

    if (!list.length) return drawEmpty(ctx, width, height, "No student data");

    const subjects = [
        { name: "Maths", key: "maths", color: "#d9836b" },
        { name: "Science", key: "science", color: "#4d9e8a" },
        { name: "English", key: "english", color: "#d4a137" }
    ];

    const barWidth = Math.min(120, (right - left - 100) / 3);
    const gap = (right - left - barWidth * 3) / 4;

    subjects.forEach((subject, i) => {
        let total = 0, highest = 0, lowest = 100, passed = 0;
        list.forEach(s => {
            const mark = +s[subject.key];
            total += mark;
            highest = Math.max(highest, mark);
            lowest = Math.min(lowest, mark);
            if (mark >= 50) passed++;
        });
        const average = total / list.length;
        const passRate = passed * 100 / list.length;
        const x = left + gap + i * (barWidth + gap);
        const h = average / 100 * (bottom - top);
        const y = bottom - h;

        ctx.fillStyle = subject.color;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, 8);
        ctx.fill();
        ctx.fillStyle = "#3b4145";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(average.toFixed(1) + "%", x + barWidth / 2, y - 9);
        ctx.font = "bold 13px Arial";
        ctx.fillText(subject.name, x + barWidth / 2, height - 28);
        ctx.font = "10px Arial";
        ctx.fillStyle = "#7d827f";
        ctx.fillText("High " + highest + " • Low " + lowest, x + barWidth / 2, height - 10);

        subjectPoints.push({ x, y, w: barWidth, h, subject, average, highest, lowest, passRate });
    });
    ctx.textAlign = "left";
    $("subjectNote").textContent = "Average is based on " + list.length + " student(s). Hover a bar for subject details.";
}

function drawStudentGraph(list) {
    const canvas = $("studentGraph");
    const { ctx, width, height } = setupCanvas(canvas, Math.max(780, list.length * 42 + 100), 310);
    const left = 55, right = width - 20, top = 24, bottom = height - 54;
    drawYAxis(ctx, left, top, right, bottom);
    drawPassLine(ctx, left, right, top, bottom);
    studentPoints = [];

    if (!list.length) return drawEmpty(ctx, width, height, "No student data");

    const step = list.length === 1 ? 0 : (right - left) / (list.length - 1);
    ctx.beginPath();
    list.forEach((s, i) => {
        const p = percentage(s);
        const x = list.length === 1 ? (left + right) / 2 : left + step * i;
        const y = bottom - p / 100 * (bottom - top);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        studentPoints.push({ x, y, student: s, value: p });
    });
    ctx.strokeStyle = "#7961a8";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    studentPoints.forEach(point => {
        const g = grade(point.value);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = g === "F" ? "#d95d65" : "#7961a8";
        ctx.fill();
        ctx.strokeStyle = "#fffdf9";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#697078";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.save();
        ctx.translate(point.x, height - 13);
        ctx.rotate(-Math.PI / 5);
        ctx.fillText(point.student.roll, 0, 0);
        ctx.restore();
    });
    ctx.textAlign = "left";
}

function drawFailedGraph(list) {
    const canvas = $("failedGraph");
    const failed = list.filter(s => percentage(s) < 50);
    const { ctx, width, height } = setupCanvas(canvas, 700, Math.max(230, failed.length * 55 + 70));
    failedPoints = [];

    if (!failed.length) {
        drawEmpty(ctx, width, height, "No failed students");
        $("failedNote").textContent = "No failed students in " + (division === "All" ? "All Divisions" : "Division " + division) + ".";
        return;
    }

    const left = 165, right = width - 35;
    const maxScore = 50;
    const step = (height - 70) / failed.length;

    ctx.font = "11px Arial";
    ctx.fillStyle = "#7c817f";
    for (let i = 0; i <= 5; i++) {
        const score = i * 10;
        const x = left + (right - left) * score / maxScore;
        ctx.beginPath();
        ctx.moveTo(x, 28); ctx.lineTo(x, height - 35);
        ctx.strokeStyle = "#eee7e0"; ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillText(score, x, height - 16);
    }

    failed.forEach((s, i) => {
        const p = percentage(s);
        const y = 48 + step * i;
        const x = left + (right - left) * p / maxScore;

        ctx.strokeStyle = "#e6b5b1";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(x, y); ctx.stroke();

        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#d95d65"; ctx.fill();
        ctx.strokeStyle = "#fffdf9"; ctx.lineWidth = 3; ctx.stroke();

        ctx.fillStyle = "#444b51";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "right";
        ctx.fillText(s.name, left - 12, y + 4);
        ctx.font = "10px Arial";
        ctx.fillStyle = "#8a8f92";
        ctx.textAlign = "left";
        ctx.fillText(s.roll + " • " + s.division, x + 13, y + 4);
        ctx.fillStyle = "#b43f4a";
        ctx.font = "bold 12px Arial";
        ctx.fillText(p.toFixed(1) + "%", right - 1, y - 13);

        failedPoints.push({ x, y, student: s, value: p });
    });
    $("failedNote").textContent = failed.length + " failed student" + (failed.length === 1 ? "" : "s") + ". Score is their average percentage.";
}

function drawEmpty(ctx, width, height, text) {
    ctx.fillStyle = "#969a98";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, width / 2, height / 2);
    ctx.textAlign = "left";
}

function showTip(id, html, event) {
    const box = $(id);
    box.innerHTML = html;
    box.style.display = "block";
    box.style.left = Math.min(event.clientX + 14, window.innerWidth - 245) + "px";
    box.style.top = Math.min(event.clientY + 14, window.innerHeight - 140) + "px";
}

function hideTip(id) { $(id).style.display = "none"; }

function nearestPoint(event, canvas, points) {
    const r = canvas.getBoundingClientRect();
    const x = event.clientX - r.left;
    const y = event.clientY - r.top;
    let nearest = null;
    let distance = 9999;
    points.forEach(point => {
        const dx = x - point.x;
        const dy = y - point.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < distance) { distance = d; nearest = point; }
    });
    return distance < 28 ? nearest : null;
}

function graphHoverCanvas(event, canvas, points, tooltipId, makeHtml) {
    const point = nearestPoint(event, canvas, points);
    if (point) showTip(tooltipId, makeHtml(point), event);
    else hideTip(tooltipId);
}

$("subjectGraph").addEventListener("mousemove", e => graphHoverCanvas(e, e.currentTarget, subjectPoints, "chartTooltip", p =>
    `<strong>${p.subject.name}</strong><br>Average: ${p.average.toFixed(1)}%<br>Highest: ${p.highest}<br>Lowest: ${p.lowest}<br>Subject Pass Rate: ${p.passRate.toFixed(1)}%`
));
$("studentGraph").addEventListener("mousemove", e => graphHoverCanvas(e, e.currentTarget, studentPoints, "studentTooltip", p =>
    `<strong>${esc(p.student.name)}</strong><br>Roll: ${esc(p.student.roll)}<br>Division: ${esc(p.student.division)}<br>Maths: ${p.student.maths}<br>Science: ${p.student.science}<br>English: ${p.student.english}<br>Average: ${p.value.toFixed(1)}%<br>Grade: ${grade(p.value)} • ${resultStatus(p.value)}`
));
$("failedGraph").addEventListener("mousemove", e => graphHoverCanvas(e, e.currentTarget, failedPoints, "failedTooltip", p =>
    `<strong>${esc(p.student.name)}</strong><br>Roll: ${esc(p.student.roll)}<br>Division: ${esc(p.student.division)}<br>Average: ${p.value.toFixed(1)}%<br>Grade: F`
));

["subjectGraph", "studentGraph", "failedGraph"].forEach(id => $(id).addEventListener("mouseleave", () => hideTip(id === "subjectGraph" ? "chartTooltip" : id === "studentGraph" ? "studentTooltip" : "failedTooltip")));

function refresh() {
    const list = divisionStudents();
    showStudents(list);
    calculateData(list);
    drawSubjectGraph(list);
    drawStudentGraph(list);
    drawFailedGraph(list);
}

$("search").addEventListener("input", filterStudents);
$("gradeFilter").addEventListener("change", filterStudents);
["editMaths", "editScience", "editEnglish"].forEach(id => $(id).addEventListener("input", updateEditPreview));
$("updateModal").addEventListener("click", e => { if (e.target === $("updateModal")) closeUpdateModal(); });
window.addEventListener("resize", refresh);

loadData();
