let subjectsMap = {};

// Khởi tạo mặc định 1 dòng buổi học khi vừa mở trang web
document.addEventListener('DOMContentLoaded', () => {
    addSessionRow();
    
    // Gắn sự kiện cho nút Thêm buổi học một cách tường minh
    const btnAddSession = document.getElementById('btnAddSessionRow');
    if (btnAddSession) {
        btnAddSession.addEventListener('click', function(e) {
            e.preventDefault();
            addSessionRow();
        });
    }
});

// Hàm tạo một dòng nhập buổi học mới
function addSessionRow(defaultDay = 2, defaultStart = 1, defaultEnd = 3) {
    const container = document.getElementById('sessionRowsContainer');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'session-row';
    
    row.innerHTML = `
        <select class="session-day">
            <option value="2" ${defaultDay==2?'selected':''}>Thứ 2</option>
            <option value="3" ${defaultDay==3?'selected':''}>Thứ 3</option>
            <option value="4" ${defaultDay==4?'selected':''}>Thứ 4</option>
            <option value="5" ${defaultDay==5?'selected':''}>Thứ 5</option>
            <option value="6" ${defaultDay==6?'selected':''}>Thứ 6</option>
            <option value="7" ${defaultDay==7?'selected':''}>Thứ 7</option>
            <option value="8" ${defaultDay==8?'selected':''}>Chủ Nhật</option>
        </select>
        <input type="number" class="session-start" min="1" max="12" placeholder="Tiết BĐ" value="${defaultStart}" required>
        <input type="number" class="session-end" min="1" max="12" placeholder="Tiết KT" value="${defaultEnd}" required>
        <button type="button" class="btn-remove-session">✕</button>
    `;

    // Gắn sự kiện xóa cho nút x của dòng này
    row.querySelector('.btn-remove-session').addEventListener('click', function() {
        row.remove();
    });

    container.appendChild(row);
}

// Xử lý submit form thêm lớp học phần
document.getElementById('subjectForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const subName = document.getElementById('subName').value.trim();
    const classId = document.getElementById('classId').value.trim();
    
    const sessionRows = document.querySelectorAll('.session-row');
    if (sessionRows.length === 0) {
        alert("Vui lòng thêm ít nhất một buổi học cho lớp này!");
        return;
    }

    let sessions = [];
    for (let row of sessionRows) {
        const day = parseInt(row.querySelector('.session-day').value);
        const start = parseInt(row.querySelector('.session-start').value);
        const end = parseInt(row.querySelector('.session-end').value);

        if (start > end) {
            alert("Tiết bắt đầu không thể lớn hơn tiết kết thúc trong một buổi học!");
            return;
        }
        sessions.push({ day, start, end });
    }

    if (!subjectsMap[subName]) {
        subjectsMap[subName] = [];
    }

    const uniqueId = Date.now() + Math.random().toString(36).substring(2, 7);
    subjectsMap[subName].push({ id: uniqueId, classId, sessions });

    // Reset form thông tin mã lớp và reset bảng buổi học về 1 dòng mặc định
    document.getElementById('classId').value = '';
    const container = document.getElementById('sessionRowsContainer');
    container.innerHTML = '';
    addSessionRow();

    renderSubjectList();
});

// Hiển thị danh sách môn học và các lớp nhiều buổi
function renderSubjectList() {
    const container = document.getElementById('subjectList');
    container.innerHTML = '';

    if (Object.keys(subjectsMap).length === 0) {
        container.innerHTML = '<p class="placeholder-text">Chưa có môn học nào được thêm.</p>';
        return;
    }

    for (let subName in subjectsMap) {
        let div = document.createElement('div');
        div.className = 'subject-item';

        let classesHtml = subjectsMap[subName].map(c => {
            let sessionStrs = c.sessions.map(s => `Thứ ${s.day} (Tiết ${s.start}-${s.end})`).join(' và ');
            return `
                <div class="class-info">
                    <span>Lớp: <b>${c.classId}</b> — [${sessionStrs}]</span>
                    <button class="btn-delete-class" onclick="deleteClass('${subName}', '${c.id}')">Xóa</button>
                </div>
            `;
        }).join('');

        div.innerHTML = `<strong>📚 ${subName}:</strong> <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 5px;">${classesHtml}</div>`;
        container.appendChild(div);
    }
}

function deleteClass(subName, classId) {
    if (subjectsMap[subName]) {
        subjectsMap[subName] = subjectsMap[subName].filter(c => c.id !== classId);
        if (subjectsMap[subName].length === 0) {
            delete subjectsMap[subName];
        }
        renderSubjectList();
    }
}

// Thuật toán kiểm tra và tìm kiếm lịch tối ưu (Hỗ trợ đa buổi)
document.getElementById('btnGenerate').addEventListener('click', function() {
    const subNames = Object.keys(subjectsMap);
    if (subNames.length === 0) {
        alert("Vui lòng nhập ít nhất một môn học!");
        return;
    }

    const avoidWeekend = document.getElementById('avoidWeekend').checked;
    const avoidPeriod1 = document.getElementById('avoidPeriod1').checked;
    const avoidPeriod12 = document.getElementById('avoidPeriod12').checked;

    let validSchedules = [];

    function backtrack(index, currentSchedule) {
        if (index === subNames.length) {
            validSchedules.push([...currentSchedule]);
            return;
        }

        let subName = subNames[index];
        for (let course of subjectsMap[subName]) {
            // 1. Kiểm tra điều kiện "Né" cho TẤT CẢ các buổi của lớp này
            let violateAvoid = false;
            for (let s of course.sessions) {
                if (avoidWeekend && (s.day === 7 || s.day === 8)) { violateAvoid = true; break; }
                if (avoidPeriod1 && s.start === 1) { violateAvoid = true; break; }
                if (avoidPeriod12 && (s.end === 11 || s.end === 12)) { violateAvoid = true; break; }
            }
            if (violateAvoid) continue;

            // 2. Kiểm tra trùng lịch với các môn đã chọn trước đó (so sánh từng cặp buổi học)
            let hasConflict = false;
            for (let selectedClass of currentSchedule) {
                for (let s1 of selectedClass.sessions) {
                    for (let s2 of course.sessions) {
                        if (s1.day === s2.day) {
                            if (Math.max(s1.start, s2.start) <= Math.min(s1.end, s2.end)) {
                                hasConflict = true;
                                break;
                            }
                        }
                    }
                    if (hasConflict) break;
                }
                if (hasConflict) break;
            }

            if (!hasConflict) {
                currentSchedule.push({ subName, ...course });
                backtrack(index + 1, currentSchedule);
                currentSchedule.pop();
            }
        }
    }

    backtrack(0, []);
    renderResults(validSchedules);
});

// Hiển thị kết quả ra màn hình
function renderResults(schedules) {
    const container = document.getElementById('resultContainer');
    container.innerHTML = '';

    if (schedules.length === 0) {
        container.innerHTML = '<p class="placeholder-text" style="color: red;">Không tìm thấy phương án thời khóa biểu nào thỏa mãn (do trùng giờ hoặc vướng điều kiện né lịch)!</p>';
        return;
    }

    container.innerHTML = `<p><strong>🎉 Tìm thấy ${schedules.length} phương án tối ưu:</strong></p>`;

    schedules.forEach((sch, idx) => {
        let div = document.createElement('div');
        div.className = 'schedule-option';
        
        let details = sch.map(item => {
            let sessionStrs = item.sessions.map(s => `Thứ ${s.day} (Tiết ${s.start}-${s.end})`).join(', ');
            return `<li><b>${item.subName}</b> (Lớp: ${item.classId}) $\rightarrow$ ${sessionStrs}</li>`;
        }).join('');
        
        div.innerHTML = `
            <h4>Phương án ${idx + 1}</h4>
            <ul>${details}</ul>
        `;
        container.appendChild(div);
    });
}
