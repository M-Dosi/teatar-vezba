
let sitsArray = [];
let x, y;
let currentGroup = null;
let groupsEnabled = true; // Flag to control whether groups can still be created
let groups = [];
let selectedRow = null;  // To store the first row selected by the group

function init() {
    const sitsNumber = getSits();
    x = sitsNumber[0];
    y = sitsNumber[1];
    if (x < 3 ) {
        alert('broj rowova ne ispunjava zenevsku konvenciju');
    }
    else{
    createSits(x, y);
}
 
}

init();

function getSits() {
    const searchParams = new URLSearchParams(window.location.search);
    let x = Number(searchParams.get('m')); // row
    let y = Number(searchParams.get('n')); // col

    return [x, y];
}

function createSits(x, y) {
    for (let i = 1; i < x + 1; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        row.id = 'row-' + i;
        document.getElementById('container').appendChild(row);

        for (let j = 1; j < y + 1; j++) {
            const sit = createSit(i, j);
            sitsArray.push(sit);

            const sitElement = document.createElement('div');
            sitElement.className = 'sit';
            sitElement.id = i + '-' + j;
            const sitElementPosition = document.createElement('div');
            sitElementPosition.innerText = i + '-' + j;
            sitElement.appendChild(sitElementPosition);
            const sitElementPrice = document.createElement('div');
            sitElementPrice.innerText = sit.price;
            sitElement.appendChild(sitElementPrice);
            sitElement.addEventListener('click', selectSit);
            row.appendChild(sitElement);
        }
    }
}

function createSit(row, col) {
    const sit = {
        row: row,
        col: col,
        price: getSeatPrice(row),
        group: undefined,  // Track group that has reserved this seat
        reserved: false,   // True if seat is reserved
        selected: false,   // True if seat is selected by the group
        available: true,   // True if seat is available
        tampone: false     // True if seat is part of a tampone zone
    };
    return sit;
}

function selectSit(event) {
    event.stopPropagation();

    if (currentGroup === null) {
        showTooltip('Nema grupe!');
        return;
    }

    const sitId = event.currentTarget.id;
    const selectedSit = event.currentTarget;
    const [row, col] = sitId.split('-').map(Number);  // Ensure row and col are numbers
    const sit = sitsArray.find(sit => sit.row === row && sit.col === col);

    // If the seat is reserved by another group or part of the tampone zone, prevent selection
    if (sit.reserved && sit.group !== currentGroup.id) {
        showTooltip('Ovo sediste je zauzeto od strane druge grupe!');
        return;
    }

    // Mark the first selected seat's row for the group
    if (!selectedRow) {
        selectedRow = sit.row;
        applyRowOpacity(); // Apply opacity to all other rows
    }

    // Ensure selection is within the same row and continuous if it's not an undo move
    if (sit.row !== selectedRow) {
        showTooltip('Samo sediste iz istog reda moze biti izabrano!');
        return;
    }

    // Handle deselection (undo) case: If the seat was previously selected, remove it
    if (sit.selected) {
        // Check if deselecting the seat would break continuity
        const remainingSelectedSeats = currentGroup.selectedSeats.filter(s => s !== sit);

        // Check if the remaining seats are continuous
        if (!isSelectionContinuous(remainingSelectedSeats)) {
            showTooltip('Deselektovanje ovog sedista lomi kontinuitet reda!');
            return; // Prevent deselection if it breaks continuity
        }

        // Proceed with deselection
        sit.selected = false;
        selectedSit.classList.remove('selected');
        selectedSit.style.backgroundColor = '';  // Remove the background color
        sit.group = undefined;
        sit.reserved = false;

        currentGroup.selectedSeats = remainingSelectedSeats;

        // If there are no more selected seats in the row, reset the row opacity and allow other rows to be selected
        if (currentGroup.selectedSeats.filter(s => s.row === sit.row).length === 0) {
            selectedRow = null;  // Allow for row change
            applyRowOpacity();   // Update row opacity to 1 for all rows
        }

        updateStatistics();
        return; // Exit early to allow undo without checking for gaps
    }

    // Now, we handle the case of a new selection or after deselection (valid undo).

    // Add the seat to the selection and check continuity with existing seats
    const selectedCols = currentGroup.selectedSeats.map(s => s.col);
    selectedCols.push(sit.col);

    // Sort the selected seats by their column
    selectedCols.sort((a, b) => a - b);

    // Check for continuity: no gaps allowed
    for (let i = 0; i < selectedCols.length - 1; i++) {
        if (selectedCols[i] + 1 !== selectedCols[i + 1]) {
            showTooltip('Sedista moraju biti izabrana u kontinutietu bez praznih mesta izmedju!');
            return;
        }
    }

    // If continuity is preserved, proceed with the selection
    sit.selected = true;
    selectedSit.classList.add('selected');
    selectedSit.style.backgroundColor = currentGroup.color;  // Apply group color
    sit.group = currentGroup.id;
    sit.reserved = true;

    currentGroup.selectedSeats.push(sit);

    updateStatistics();
    applyRowOpacity(); // Reapply row opacity after selection
}

// Check if the selected seats are continuous (no gaps)
function isSelectionContinuous(selectedSeats) {
    if (selectedSeats.length < 2) {
        return true;  // A single seat is always considered continuous
    }

    // Sort the selected seats by column to check continuity
    selectedSeats.sort((a, b) => a.col - b.col);

    for (let i = 0; i < selectedSeats.length - 1; i++) {
        const current = selectedSeats[i];
        const next = selectedSeats[i + 1];
        if (next.col !== current.col + 1) {
            return false;  // If the columns are not adjacent, it's not continuous
        }
    }

    return true;
}



// Check if the selected seats are continuous (no gaps)
function isSelectionContinuous(selectedSeats) {
    if (selectedSeats.length < 2) {
        return true;  // A single seat is always considered continuous
    }

    // Sort the selected seats by column to check continuity
    selectedSeats.sort((a, b) => a.col - b.col);
    // Now check if the seats are continuous from left to right
    for (let i = 0; i < selectedSeats.length - 1; i++) {
        const current = selectedSeats[i];
        const next = selectedSeats[i + 1];
        if (next.col !== current.col + 1) {
            return false;  // If the columns are not adjacent, it's not continuous
        }
    }

    return true;
}

function applyRowOpacity() {

    const rows = document.getElementsByClassName('row');
    // Check if any seat is selected in the row
    for (let row of rows) {
        row.style.opacity = 1;  // Reset opacity to 1 for all rows by default
    }
    // Check if any seat is selected in the row
    for (let row of rows) {
        const rowId = parseInt(row.id.split('-')[1]);
        const isSelectedInRow = currentGroup.selectedSeats.some(s => s.row === rowId); // Check if any seat is selected in this row

        // If no seat is selected in the row, reset opacity for this row and set others to 0.6
        if (isSelectedInRow) {
            row.style.opacity = 1; // Keep the selected row with opacity 1
        } else {
            row.style.opacity = 0.6; // Set other rows to opacity 0.6
        }
    }

    // If no rows are selected, reset opacity for all rows to 1 (allowing all rows to be selected)
    if (currentGroup.selectedSeats.length === 0) {
        for (let row of rows) {
            row.style.opacity = 1; // Reset all rows' opacity to 1
        }
    }
}



function finishGroupSelection() {

    // document.getElementById('startButton').style.display = 'inline';
    // document.getElementById('finishButton').style.display = 'none';
    // document.getElementById('noMoreGroupsButton').style.display = 'inline';
    document.getElementById('startButton').disabled = false;
    document.getElementById('finishButton').disabled = true;
    document.getElementById('noMoreGroupsButton').disabled = false;

    showTooltip(`Grupa ${currentGroup.id} zavrsila biranje.`);

    // Apply the tampone zone around selected seats after finishing
    currentGroup.selectedSeats.forEach(sit => applyTamponeZone(sit));

    // Reset the current group and row state
    currentGroup = null;
    selectedRow = null;
    // Reset all rows opacity to 1 after finishing selection
    applyRowOpacity();
    updateGroupInfo();
}


function startNewGroup() {
    if (!groupsEnabled) {
        showTooltip('Nema vise grupa!');
        return;
    }

    const groupId = prompt('Enter a new group ID:');
    if (!groupId || groupId.trim() === '') {
      showTooltip('Ime grupe obavezno!');
      return;
    }
    if (groups.find(group => group.id === groupId)) {
      showTooltip('Ime grupe vec postoji!');
      return;
    }




    const groupColor = getRandomColor(); // Assign a unique color for the group
    currentGroup = {
        id: groupId,
        selectedSeats: [],
        color: groupColor,
    };
    groups.push(currentGroup);

   
    showTooltip(`Grupa ${groupId} sada bira sedista!`);
    updateGroupInfo();

    // Enable/Disable buttons based on the current state
    // document.getElementById('startButton').style.display = 'none'; // Hide the button in the HTML
    // document.getElementById('finishButton').style.display = 'inline'; // Show the button in the HTML
    // document.getElementById('noMoreGroupsButton').style.display = 'none';
    document.getElementById('startButton').disabled = true;
    document.getElementById('finishButton').disabled = false;
    document.getElementById('noMoreGroupsButton').disabled = true;




}
function applyTamponeZone(sit) {
    const row = sit.row;
    const col = sit.col;

    // Check for adjacent seats to mark as tampone (buffer zone)
    const adjacentSeats = [
        { row: row - 1, col: col }, // Seat above
        { row: row + 1, col: col }, // Seat below
        { row: row, col: col - 1 }, // Seat left
        { row: row, col: col + 1 },  // Seat right

        { row: row - 1, col: col - 1 }, // gore levo
        { row: row - 1, col: col + 1 }, // gore desno
        { row: row + 1, col: col - 1 }, // dolje levo
        { row: row + 1, col: col + 1 } // dole desno
    ];

    adjacentSeats.forEach(({ row, col }) => {
        if (row > 0 && row <= x && col > 0 && col <= y) {
            const adjacentSit = sitsArray.find(s => s.row === row && s.col === col);
            if (adjacentSit && !adjacentSit.selected && !adjacentSit.reserved) {
                const sitElement = document.getElementById(`${row}-${col}`);
                sitElement.classList.add('tampone');  // Add tampone class for the buffer zone
                adjacentSit.tampone = true;  // Mark it as part of the tampone zone

                // Mark this tampone seat as reserved for the next group
                adjacentSit.reserved = true;
            }
        }
    });
}










// cena u odnosu na red (poziciju)
function getSeatPrice(row) {
    const totalRows = x; 
    const midRow = Math.ceil(totalRows / 2); 
  
    if (row === 1 || row === totalRows) {
        return 300; // First and last rows are always 300
    }
    if (totalRows % 2 === 0) {
    //    parno

        if (row === midRow || row === midRow + 1) {
            return 500; // Two middle rows are priced at 500
        }
        const proportion = (500 - 300) / (midRow - 1);
        if (row < midRow) {
          return Math.round(300 + proportion * (row - 1));
        }
        if (row > midRow + 1) {
          return Math.round(500 - proportion * (row - midRow - 1));
        }  
    } 
    else {
        // Odd number of rows
        if (row === midRow) {
          return 500; // Middle row is priced at 500
        }
        const proportion = (500 - 300) / (midRow - 1);
        if (row < midRow) {
          return Math.round(300 + proportion * (row - 1));
        }
        if (row > midRow) {
          return Math.round(500 - proportion * (row - midRow));
        }
    }
  
}

































function updateGroupInfo() {
    if (currentGroup) {
        document.getElementById('groupInfo').innerText = `Group ${currentGroup.id} is selecting seats.`;
    } else {
        document.getElementById('groupInfo').innerText = `No group is currently selecting seats.`;
    }
}

// function updateStatistics() {
//     const selectedSeatsCount = currentGroup.selectedSeats.length;
//     const unselectedSeatsCount = sitsArray.length - selectedSeatsCount;
//     const totalRevenue = currentGroup.selectedSeats.reduce((acc, sit) => acc + sit.price, 0);

//     document.getElementById('totalSeats').innerText = sitsArray.length;
//     document.getElementById('selectedSeats').innerText = selectedSeatsCount;
//     document.getElementById('unselectedSeats').innerText = unselectedSeatsCount;
//     document.getElementById('totalRevenue').innerText = totalRevenue;

//     updateGroupStatistics();
// }
function updateStatistics() {
    const totalSeats = sitsArray.length;
    const selectedSeatsCount = sitsArray.filter(sit => sit.selected).length;
    const unselectedSeatsCount = totalSeats - selectedSeatsCount;
    const totalRevenue = sitsArray.filter(sit => sit.selected).reduce((acc, sit) => acc + sit.price, 0);
  
    document.getElementById('totalSeats').innerText = totalSeats;
    document.getElementById('selectedSeats').innerText = selectedSeatsCount;
    document.getElementById('unselectedSeats').innerText = unselectedSeatsCount;
    document.getElementById('totalRevenue').innerText = totalRevenue;
  
    updateGroupStatistics();
  }
function updateGroupStatistics() {
    const tbody = document.querySelector('#groupStatistics tbody');
    tbody.innerHTML = ''; // Clear current data

    groups.forEach(group => {
        const row = document.createElement('tr');
        const groupName = document.createElement('td');
        groupName.style.backgroundColor = group.color; 
        groupName.innerText = group.id;
        const selectedSeats = document.createElement('td');
        selectedSeats.innerText = group.selectedSeats.length;
        selectedSeats.style.backgroundColor = group.color; 
        const revenue = document.createElement('td');
        revenue.style.backgroundColor = group.color; 
        revenue.innerText = group.selectedSeats.reduce((acc, sit) => acc + sit.price, 0);
        row.appendChild(groupName);
        row.appendChild(selectedSeats);
        row.appendChild(revenue);
        tbody.appendChild(row);
    });
}

let colors = ['#cf4647', '#005689',  '#f96d00', '#6643b5', '#014955', '#734444', '#5da7ae']; // Red, Blue, Green

function getRandomColor() {
    if (colors.length === 0) {
        // Reset the array if all colors have been used
        colors = ['#cf4647', '#005689',  '#f96d00', '#6643b5', '#014955', '#734444' , '#5da7ae'];
    }

    // Get a random index from the remaining colors array
    const randomIndex = Math.floor(Math.random() * colors.length);
    const selectedColor = colors[randomIndex];

    // Remove the selected color from the array to avoid repetition
    colors.splice(randomIndex, 1);

    return selectedColor;
}






function noMoreGroups() {
    groupsEnabled = false;
    // document.getElementById('startButton').style.display = 'none';
    // document.getElementById('finishButton').style.display = 'none';
    // document.getElementById('noMoreGroupsButton').style.display = 'none';
    document.getElementById('startButton').disabled = true;
    document.getElementById('finishButton').disabled = true;
    document.getElementById('noMoreGroupsButton').disabled = true;
    showTooltip('Nema vise grupa! Ostala sedista su zauzeta.');
    // Grab all remaining unselected seats
    grabRemainingSeats();

   
}
function grabRemainingSeats() {
    sitsArray.forEach(sit => {
        if (!sit.selected && !sit.reserved) {
            // Mark this seat as grabbed
            sit.reserved = true;
            const sitElement = document.getElementById(`${sit.row}-${sit.col}`);
            sitElement.style.backgroundColor = 'gray';  // Change the color to indicate grabbed seat
            sitElement.classList.add('reserved');  // Optionally, you can add a "reserved" class for styling
        }
    });

    // Optionally, update statistics or display a message that all seats are grabbed
    updateStatistics();
}

function showTooltip(message) {
    // Create a tooltip element
    const tooltip = document.createElement('div');
   tooltip.className = 'tooltip';
   tooltip.innerText = message;

    // Append the tooltip to the body
    document.body.appendChild(tooltip);

    // Set a timeout to remove the tooltip after 2 seconds
    setTimeout(() => {
        tooltip.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(tooltip);
        }, 300);
    }, 2000);
}






// deselektoivanje kad se pravi grupa unazad baguje 
// juri pravac reda levo desno od grunog deselekta sledeci nece na drugu stranu bag