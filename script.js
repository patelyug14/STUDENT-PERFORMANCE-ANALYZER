
let students = [];
let division = "All";
let subjectBars = [];
let studentPoints = [];
let failedPoints = [];
let editingId = null;

const $ = id => document.getElementById(id);


/* LOAD DATA */

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
        alert("Could not load students:\n" + error.message);
    }
}


/* DIVISION MENU */

function changeDivision(value, button) {
    division = value;

    document.querySelectorAll(".division").forEach(item => {
        item.classList.remove("active");
    });

    button.classList.add("active");

    const title = value === "All"
        ? "All Divisions"
        : "Division " + value;

    ["divisionTitle", "graphDivision", "tableDivision"].forEach(id => {
        $(id).textContent = title;
    });

    if (value !== "All") {
        $("addDivision").value = value;
    }

    clearSearch();
    refresh();
}

function divisionStudents() {
    return division === "All"
        ? students
        : students.filter(student => student.division === division);
}


/* CALCULATIONS */

function percentage(student) {
    return (
        Number(student.maths) +
        Number(student.science) +
        Number(student.english)
    ) / 3;
}

function grade(value) {
    if (value >= 80) return "A";
    if (value >= 70) return "B";
    if (value >= 60) return "C";
    if (value >= 50) return "D";
    return "F";
}

function resultStatus(value) {
    return value >= 50 ? "Passed" : "Failed";
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}


/* STUDENT TABLE */

function showStudents(list) {
    const table = $("studentTable");

    if (!list.length) {
        table.innerHTML =
            "<tr><td colspan='10'>No student found</td></tr>";
        return;
    }

    table.innerHTML = list.map(student => {
        const value = percentage(student);
        const g = grade(value);
        const failed = value < 50;

        return `
            <tr class="${failed ? "failed-row" : ""}">
                <td>${escapeHTML(student.name)}</td>
                <td>${escapeHTML(student.roll)}</td>
                <td>${escapeHTML(student.division)}</td>
                <td>${student.maths}</td>
                <td>${student.science}</td>
                <td>${student.english}</td>
                <td>${value.toFixed(1)}%</td>
                <td class="grade-${g.toLowerCase()}">${g}</td>
                <td>
                    <span class="status-badge ${failed ? "failed" : "passed"}">
                        ${resultStatus(value)}
                    </span>
                </td>
                <td class="action-cell">
                    <button class="update"
                        onclick="updateStudent(${Number(student.id)})">
                        Edit
                    </button>
                    <button class="delete"
                        onclick="deleteStudent(${Number(student.id)})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}


/* DASHBOARD CARDS */

function calculateData(list) {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let best = null;
    let worst = null;

    list.forEach(student => {
        const value = percentage(student);
        total += value;

        if (value >= 50) {
            passed++;
        } else {
            failed++;
        }

        if (!best || value > percentage(best)) {
            best = student;
        }

        if (!worst || value < percentage(worst)) {
            worst = student;
        }
    });

    const average = list.length ? total / list.length : 0;
    const highest = best ? percentage(best) : 0;
    const lowest = worst ? percentage(worst) : 0;
    const passRate = list.length ? passed * 100 / list.length : 0;
    const failRate = list.length ? failed * 100 / list.length : 0;

    $("average").textContent = average.toFixed(1) + "%";
    $("highest").textContent = highest.toFixed(1) + "%";
    $("lowest").textContent = lowest.toFixed(1) + "%";
    $("pass").textContent = passRate.toFixed(1) + "%";
    $("failed").textContent = failed;
    $("divisionCount").textContent = list.length;

    $("averageDetail").textContent =
        "Average of " + list.length + " students";

    $("highestDetail").textContent =
        best ? best.name + " • " + best.roll : "No data";

    $("lowestDetail").textContent =
        worst ? worst.name + " • " + worst.roll : "No data";

    $("passDetail").textContent =
        passed + " of " + list.length + " passed";

    $("failedDetail").textContent =
        failed + " below 50% average";

    $("averageInfo").innerHTML =
        "Average: " + average.toFixed(1) +
        "%<br>Students: " + list.length;

    $("highestInfo").innerHTML = best
        ? "Name: " + escapeHTML(best.name) +
          "<br>Roll: " + escapeHTML(best.roll) +
          "<br>Division: " + best.division +
          "<br>Score: " + highest.toFixed(1) + "%"
        : "No data";

    $("lowestInfo").innerHTML = worst
        ? "Name: " + escapeHTML(worst.name) +
          "<br>Roll: " + escapeHTML(worst.roll) +
          "<br>Division: " + worst.division +
          "<br>Score: " + lowest.toFixed(1) + "%"
        : "No data";

    $("passInfo").innerHTML =
        "Passed: " + passed +
        "<br>Failed: " + failed +
        "<br>Pass rate: " + passRate.toFixed(1) + "%";

    $("failedInfo").innerHTML =
        "Failed: " + failed +
        "<br>Failure rate: " + failRate.toFixed(1) + "%" +
        "<br>Rule: Average below 50%";
}


/* VALIDATION */

function validStudent(student, fieldIds) {
    if (!student.name || !student.roll) {
        return false;
    }

    if (fieldIds.some(id => $(id).value.trim() === "")) {
        return false;
    }

    return [
        student.maths,
        student.science,
        student.english
    ].every(mark =>
        Number.isFinite(mark) && mark >= 0 && mark <= 100
    );
}


/* ADD STUDENT */

async function addStudent() {
    const student = {
        name: $("name").value.trim(),
        roll: $("roll").value.trim(),
        division: $("addDivision").value,
        maths: Number($("maths").value),
        science: Number($("science").value),
        english: Number($("english").value)
    };

    if (!validStudent(student, ["maths", "science", "english"])) {
        alert("Enter the name, roll number and all marks from 0 to 100.");
        return;
    }

    const duplicate = students.some(item =>
        item.roll.toLowerCase() === student.roll.toLowerCase()
    );

    if (duplicate) {
        alert("This roll number already exists.");
        return;
    }

    const { error } = await db.from("students").insert([student]);

    if (error) {
        alert("Student could not be added:\n" + error.message);
        return;
    }

    clearForm();
    await loadData();
}


/* EDIT STUDENT */

function updateStudent(id) {
    const student = students.find(item => Number(item.id) === Number(id));

    if (!student) {
        alert("Student record not found.");
        return;
    }

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
    const maths = $("editMaths").value === ""
        ? 0 : Number($("editMaths").value);

    const science = $("editScience").value === ""
        ? 0 : Number($("editScience").value);

    const english = $("editEnglish").value === ""
        ? 0 : Number($("editEnglish").value);

    const average = (maths + science + english) / 3;
    const g = grade(average);

    $("editResultPreview").textContent =
        average.toFixed(1) + "%";

    $("editGradePreview").textContent = "Grade " + g;
    $("editGradePreview").className =
        "grade-preview grade-" + g.toLowerCase();
}

async function saveStudentUpdate() {
    if (editingId === null) return;

    const student = {
        name: $("editName").value.trim(),
        roll: $("editRoll").value.trim(),
        division: $("editDivision").value,
        maths: Number($("editMaths").value),
        science: Number($("editScience").value),
        english: Number($("editEnglish").value)
    };

    if (!validStudent(student, [
        "editMaths", "editScience", "editEnglish"
    ])) {
        alert("Enter all details and marks from 0 to 100.");
        return;
    }

    const duplicate = students.some(item =>
        item.roll.toLowerCase() === student.roll.toLowerCase() &&
        Number(item.id) !== Number(editingId)
    );

    if (duplicate) {
        alert("Another student already uses this roll number.");
        return;
    }

    const { error } = await db
        .from("students")
        .update(student)
        .eq("id", editingId);

    if (error) {
        alert("Student could not be updated:\n" + error.message);
        return;
    }

    closeUpdateModal();
    await loadData();
}


/* DELETE STUDENT */

async function deleteStudent(id) {
    if (!confirm("Are you sure you want to delete this student?")) {
        return;
    }

    const { error } = await db
        .from("students")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Student could not be deleted:\n" + error.message);
        return;
    }

    await loadData();
}


/* SEARCH AND FILTER */

function clearForm() {
    ["name", "roll", "maths", "science", "english"].forEach(id => {
        $(id).value = "";
    });
}

function clearSearch() {
    $("search").value = "";
    $("gradeFilter").value = "All";
}

function getFilteredStudents(list) {
    const query = $("search").value.trim().toLowerCase();
    const selectedGrade = $("gradeFilter").value;

    return list.filter(student => {
        const matchesText =
            student.name.toLowerCase().includes(query) ||
            student.roll.toLowerCase().includes(query);

        const matchesGrade =
            selectedGrade === "All" ||
            grade(percentage(student)) === selectedGrade;

        return matchesText && matchesGrade;
    });
}

function filterStudents() {
    showStudents(getFilteredStudents(divisionStudents()));
}


/* RESPONSIVE CANVAS */

function prepareCanvas(canvas, requestedWidth = 620, height = 285) {
    const availableWidth = canvas.parentElement.clientWidth;
    const width = Math.max(1, availableWidth || requestedWidth);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    canvas.style.width = "100%";
    canvas.style.height = height + "px";

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    return { ctx, width, height };
}


/* GRAPH GRID */

function drawGrid(ctx, width, height, left, right, top, bottom, maxValue = 100) {
    const graphHeight = height - top - bottom;

    ctx.strokeStyle = "#e8e2da";
    ctx.lineWidth = 1;
    ctx.font = "10px Arial";
    ctx.fillStyle = "#77717a";
    ctx.textAlign = "right";

    for (let i = 0; i <= 5; i++) {
        const y = top + graphHeight * i / 5;
        const value = maxValue - maxValue * i / 5;

        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(width - right, y);
        ctx.stroke();

        ctx.fillText(String(value), left - 8, y + 4);
    }

    ctx.textAlign = "left";
}


/* SUBJECT AVERAGE BAR GRAPH */

function drawSubjectGraph(list) {
    const canvas = $("subjectGraph");
    const { ctx, width, height } = prepareCanvas(canvas);

    subjectBars = [];

    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, width, height);

    const left = 42;
    const right = 15;
    const top = 25;
    const bottom = 40;

    drawGrid(ctx, width, height, left, right, top, bottom);

    if (!list.length) {
        ctx.fillStyle = "#77717a";
        ctx.font = "13px Arial";
        ctx.fillText("No student data available", 15, 145);
        $("subjectNote").textContent = "No data available.";
        return;
    }

    const names = ["Maths", "Science", "English"];
    const fields = ["maths", "science", "english"];
    const colors = ["#f5845b", "#28a39b", "#dfa52f"];

    const values = fields.map(field =>
        list.reduce((sum, student) => sum + Number(student[field]), 0) /
        list.length
    );

    const graphWidth = width - left - right;
    const graphHeight = height - top - bottom;

    const barWidth = Math.min(70, graphWidth / 5);
    const gap = Math.min(65, Math.max(8, (graphWidth - 3 * barWidth) / 2));
    const totalWidth = 3 * barWidth + 2 * gap;
    const startX = left + (graphWidth - totalWidth) / 2;

    const passY = top + graphHeight * 0.5;

    ctx.save();
    ctx.strokeStyle = "#c18a2e";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(left, passY);
    ctx.lineTo(width - right, passY);
    ctx.stroke();
    ctx.restore();

    values.forEach((value, index) => {
        const barHeight = value / 100 * graphHeight;
        const x = startX + index * (barWidth + gap);
        const y = top + graphHeight - barHeight;

        ctx.fillStyle = colors[index];
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.textAlign = "center";
        ctx.fillStyle = "#414047";
        ctx.font = "bold 11px Arial";
        ctx.fillText(
            value.toFixed(1) + "%",
            x + barWidth / 2,
            Math.max(13, y - 7)
        );

        ctx.font = "11px Arial";
        ctx.fillText(names[index], x + barWidth / 2, height - 14);

        subjectBars.push({
            x,
            y,
            w: barWidth,
            h: barHeight,
            name: names[index],
            value
        });
    });

    ctx.textAlign = "left";

    $("subjectNote").textContent =
        "Average calculated from " + list.length +
        " student(s). Hover over a bar for details.";
}


/* STUDENT PERFORMANCE LINE GRAPH */

function drawStudentGraph(list) {
    const canvas = $("studentGraph");
    const { ctx, width, height } = prepareCanvas(canvas);

    studentPoints = [];

    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, width, height);

    const left = 42;
    const right = 14;
    const top = 22;
    const bottom = 48;

    drawGrid(ctx, width, height, left, right, top, bottom);

    if (!list.length) {
        ctx.fillStyle = "#77717a";
        ctx.font = "13px Arial";
        ctx.fillText("No student data available", 15, 145);
        return;
    }

    const graphWidth = width - left - right;
    const graphHeight = height - top - bottom;

    const xPosition = index => list.length === 1
        ? left + graphWidth / 2
        : left + index * graphWidth / (list.length - 1);

    const yPosition = value =>
        top + graphHeight - value / 100 * graphHeight;

    const passY = yPosition(50);

    ctx.save();
    ctx.strokeStyle = "#c18a2e";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(left, passY);
    ctx.lineTo(width - right, passY);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#a97920";
    ctx.font = "10px Arial";
    ctx.textAlign = "right";
    ctx.fillText("50%", width - right, passY - 5);

    ctx.beginPath();

    list.forEach((student, index) => {
        const x = xPosition(index);
        const value = percentage(student);
        const y = yPosition(value);

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        studentPoints.push({ x, y, student, value });
    });

    ctx.strokeStyle = "#9064a9";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    studentPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = point.value < 50 ? "#dd5959" : "#9064a9";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
    });

    const labelEvery = Math.max(1, Math.ceil(list.length / 10));

    studentPoints.forEach((point, index) => {
        if (index % labelEvery !== 0 && index !== list.length - 1) {
            return;
        }

        ctx.save();
        ctx.translate(point.x, height - 10);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = "#77717a";
        ctx.font = "9px Arial";
        ctx.textAlign = "right";
        ctx.fillText(String(point.student.roll), 0, 0);
        ctx.restore();
    });

    ctx.textAlign = "left";
}


/* FAILED STUDENTS LOLLIPOP GRAPH */

function drawFailedGraph(list) {
    const canvas = $("failedGraph");
    const { ctx, width, height } = prepareCanvas(canvas);

    failedPoints = [];

    ctx.fillStyle = "#fffaf7";
    ctx.fillRect(0, 0, width, height);

    const failedStudents = list.filter(student => percentage(student) < 50);

    $("failedNote").textContent = failedStudents.length
        ? failedStudents.length + " failed student(s). Hover over a point for details."
        : "No failed students in this division.";

    if (!failedStudents.length) {
        ctx.fillStyle = "#77717a";
        ctx.font = "13px Arial";
        ctx.textAlign = "center";
        ctx.fillText("No failed students", width / 2, height / 2);
        ctx.textAlign = "left";
        return;
    }

    const left = 42;
    const right = 14;
    const top = 22;
    const bottom = 48;

    drawGrid(ctx, width, height, left, right, top, bottom, 50);

    const graphWidth = width - left - right;
    const graphHeight = height - top - bottom;

    const xPosition = index => failedStudents.length === 1
        ? left + graphWidth / 2
        : left + index * graphWidth / (failedStudents.length - 1);

    const yPosition = value =>
        top + graphHeight - value / 50 * graphHeight;

    failedStudents.forEach((student, index) => {
        const value = percentage(student);
        const x = xPosition(index);
        const y = yPosition(value);
        const baseline = top + graphHeight;

        ctx.strokeStyle = "#e8b8b3";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, baseline);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#dd5959";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#a94448";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(value.toFixed(1) + "%", x, y - 9);

        failedPoints.push({ x, y, student, value });
    });

    const labelEvery = Math.max(1, Math.ceil(failedStudents.length / 10));

    failedPoints.forEach((point, index) => {
        if (index % labelEvery !== 0 && index !== failedPoints.length - 1) {
            return;
        }

        ctx.save();
        ctx.translate(point.x, height - 10);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = "#77717a";
        ctx.font = "9px Arial";
        ctx.textAlign = "right";
        ctx.fillText(String(point.student.roll), 0, 0);
        ctx.restore();
    });

    ctx.textAlign = "left";
}


/* TOOLTIP HELPERS */

function showTip(id, html, event) {
    const box = $(id);

    box.innerHTML = html;
    box.style.display = "block";

    const tipWidth = box.offsetWidth;
    const tipHeight = box.offsetHeight;

    const left = Math.min(
        event.clientX + 12,
        window.innerWidth - tipWidth - 8
    );

    const top = Math.min(
        event.clientY + 12,
        window.innerHeight - tipHeight - 8
    );

    box.style.left = Math.max(5, left) + "px";
    box.style.top = Math.max(5, top) + "px";
}

function hideTip(id) {
    $(id).style.display = "none";
}

function canvasPosition(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    return {
        x: (event.clientX - rect.left) * canvas.width / rect.width / dpr,
        y: (event.clientY - rect.top) * canvas.height / rect.height / dpr
    };
}

function nearestPoint(points, x, y, limit = 14) {
    let nearest = null;
    let smallest = limit;

    points.forEach(point => {
        const dx = x - point.x;
        const dy = y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < smallest) {
            smallest = distance;
            nearest = point;
        }
    });

    return nearest;
}


/* SUBJECT TOOLTIP */

$("subjectGraph").addEventListener("mousemove", event => {
    const pos = canvasPosition(event, event.currentTarget);

    const bar = subjectBars.find(item =>
        pos.x >= item.x &&
        pos.x <= item.x + item.w &&
        pos.y >= item.y &&
        pos.y <= item.y + item.h
    );

    if (!bar) {
        hideTip("chartTooltip");
        return;
    }

    showTip(
        "chartTooltip",
        "<strong>" + escapeHTML(bar.name) + "</strong>" +
        "<br>Average: " + bar.value.toFixed(1) + "%" +
        "<br>Pass benchmark: 50%",
        event
    );
});

$("subjectGraph").addEventListener("mouseleave", () => {
    hideTip("chartTooltip");
});


/* STUDENT TOOLTIP */

$("studentGraph").addEventListener("mousemove", event => {
    const pos = canvasPosition(event, event.currentTarget);
    const point = nearestPoint(studentPoints, pos.x, pos.y);

    if (!point) {
        hideTip("studentTooltip");
        return;
    }

    const student = point.student;

    showTip(
        "studentTooltip",
        "<strong>" + escapeHTML(student.name) + "</strong>" +
        "<br>Roll: " + escapeHTML(student.roll) +
        "<br>Division: " + escapeHTML(student.division) +
        "<br>Maths: " + student.maths +
        "<br>Science: " + student.science +
        "<br>English: " + student.english +
        "<br>Average: " + point.value.toFixed(1) + "%" +
        "<br>Grade: " + grade(point.value) +
        "<br>Status: " + resultStatus(point.value),
        event
    );
});

$("studentGraph").addEventListener("mouseleave", () => {
    hideTip("studentTooltip");
});


/* FAILED STUDENT TOOLTIP */

$("failedGraph").addEventListener("mousemove", event => {
    const pos = canvasPosition(event, event.currentTarget);
    const point = nearestPoint(failedPoints, pos.x, pos.y, 16);

    if (!point) {
        hideTip("failedTooltip");
        return;
    }

    const student = point.student;

    showTip(
        "failedTooltip",
        "<strong>" + escapeHTML(student.name) + "</strong>" +
        "<br>Roll: " + escapeHTML(student.roll) +
        "<br>Division: " + escapeHTML(student.division) +
        "<br>Maths: " + student.maths +
        "<br>Science: " + student.science +
        "<br>English: " + student.english +
        "<br>Average: " + point.value.toFixed(1) + "%" +
        "<br>Grade: F<br>Status: Failed",
        event
    );
});

$("failedGraph").addEventListener("mouseleave", () => {
    hideTip("failedTooltip");
});


/* UPDATE PREVIEW EVENTS */

["editMaths", "editScience", "editEnglish"].forEach(id => {
    $(id).addEventListener("input", updateEditPreview);
});

$("updateModal").addEventListener("click", event => {
    if (event.target === $("updateModal")) {
        closeUpdateModal();
    }
});


/* SEARCH EVENTS */

$("search").addEventListener("input", filterStudents);
$("gradeFilter").addEventListener("change", filterStudents);


/* REFRESH DASHBOARD */

function refresh() {
    const list = divisionStudents();

    showStudents(getFilteredStudents(list));
    calculateData(list);

    drawSubjectGraph(list);
    drawStudentGraph(list);
    drawFailedGraph(list);
}


/* REDRAW WHEN THE WINDOW RESIZES */

let resizeTimer;

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
        refresh();
    }, 150);
});


/* START */

loadData();
