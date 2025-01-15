
let sitsArray = [];
let x, y;
let currentGroup = null;
let groupsEnabled = true; // moze da se kreiraju grupe
let groups = [];
let selectedRow = null;  // prvi red selektovan za grupu

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
            sitElementPosition.className = 'sit-position';
            sitElement.appendChild(sitElementPosition);
            const sitElementPrice = document.createElement('div');
            sitElementPrice.innerText = sit.price;
            sitElementPrice.className = 'sit-price';
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
        group: undefined,  // grupa 
        reserved: false,   // True if rezervisano
        selected: false,   // True if selected by group
        available: true,   // True if aviable
        tampone: false     // True if tampon zona
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
    const [row, col] = sitId.split('-').map(Number);  // da su brojke
    const sit = sitsArray.find(sit => sit.row === row && sit.col === col);

    // If  reserved by another group ili deo tampone zone, spreci selection
    if (sit.reserved && sit.group !== currentGroup.id) {
        showTooltip('Ovo sediste je zauzeto od strane druge grupe!');
        return;
    }

    // red mark za prvo sediste
    if (!selectedRow) {
        selectedRow = sit.row;
        applyRowOpacity(); // Apply opacity
    }

    // isti red i kontinuitet ako nije undo
    if (sit.row !== selectedRow) {
        showTooltip('Samo sediste iz istog reda moze biti izabrano!');
        return;
    }

    //  deselection (undo) case: If the seat was previously selected, remove it
    if (sit.selected) {
        // sedista u kontinuitetu
        const remainingSelectedSeats = currentGroup.selectedSeats.filter(s => s !== sit);

        // ostala sedista u kontonuitetu check
        if (!isSelectionContinuous(remainingSelectedSeats)) {
            showTooltip('Deselektovanje ovog sedista lomi kontinuitet reda!');
            return; // spreci deselekciju ako se kosi sa kontinitetom
        }

        // Deselekcija
        sit.selected = false;
        selectedSit.classList.remove('selected');
        selectedSit.style.backgroundColor = '';  // skini background color
        sit.group = undefined;
        sit.reserved = false;

        currentGroup.selectedSeats = remainingSelectedSeats;

        // ako nema selected seats u redu, reset row opacity i dozvoli selekciju drugog reda
        if (currentGroup.selectedSeats.filter(s => s.row === sit.row).length === 0) {
            selectedRow = null;  // dozvoli promenu reda
            applyRowOpacity();   // Update row opacity to 1 for all rows
        }

        updateStatistics();
        return; // exit rano da dozvoli undo bez provere praznih mesta
    }

    // Now, we handle the case of a new selection or after deselection (valid undo).

    // add seat u selekciju
    const selectedCols = currentGroup.selectedSeats.map(s => s.col);
    selectedCols.push(sit.col);
    // sort po col za seat
    selectedCols.sort((a, b) => a - b);
    // check continuitet NO gaps
    for (let i = 0; i < selectedCols.length - 1; i++) {
        if (selectedCols[i] + 1 !== selectedCols[i + 1]) {
            showTooltip('Sedista moraju biti izabrana u kontinutietu bez praznih mesta izmedju!');
            return;
        }
    }
    // continuitet sacuvan, nastai sa selekcijom
    sit.selected = true;
    selectedSit.classList.add('selected');
    selectedSit.style.backgroundColor = currentGroup.color;  // boja
    sit.group = currentGroup.id;
    sit.reserved = true;

    currentGroup.selectedSeats.push(sit);

    updateStatistics();
    applyRowOpacity(); // reaply opacity
}
// sedista (no gaps) check
function isSelectionContinuous(selectedSeats) {
    if (selectedSeats.length < 2) {
        return true;  // slucaj za 1 sediste
    }
    // check za col
    selectedSeats.sort((a, b) => a.col - b.col);
    // check levo - desno
    for (let i = 0; i < selectedSeats.length - 1; i++) {
        const current = selectedSeats[i];
        const next = selectedSeats[i + 1];
        if (next.col !== current.col + 1) {
            return false;  // false ako nisu 1 do drugog
        }
    }

    return true;
}
// opacity za red
function applyRowOpacity() {
    const rows = document.getElementsByClassName('row');
    // bilo koje sediste selektovano
    for (let row of rows) {
        row.style.opacity = 1;  // reset 1 za sve redove
    }
    if (currentGroup && currentGroup.selectedSeats){ //reset na 1
    // bilo koje sediste selektovano
    for (let row of rows) {
        const rowId = parseInt(row.id.split('-')[1]);
        let isSelectedInRow = false; // initialize isSelectedInRow to false
        // const isSelectedInRow = currentGroup.selectedSeats.some(s => s.row === rowId); // ovaj sed
        if (currentGroup && currentGroup.selectedSeats) {
            isSelectedInRow = currentGroup.selectedSeats.some(s => s.row === rowId); // ovaj sed
        }
        // ako nema selektovano u redu ostali to 0.6 ovaj 1
        if (isSelectedInRow) {
            row.style.opacity = 1; // selektovani red opacity 1
        } else {
            row.style.opacity = 0.6; // ostali 0.6
        }
    }

    // If no rows are selected, reset opacity for all rows to 1 (allowing all rows to be selected)
    if (currentGroup && currentGroup.selectedSeats && currentGroup.selectedSeats.length === 0) {
        for (let row of rows) {
            row.style.opacity = 1; // Reset all rows' opacity to 1
        }
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
    // tampon zona dodeli
    currentGroup.selectedSeats.forEach(sit => applyTamponeZone(sit));
    // Reset za state
    currentGroup = null;
    selectedRow = null;
    // Reset opaciti za sve redove posle finishing selection
    applyRowOpacity();
    updateGroupInfo();
}


function startNewGroup() {
    if (!groupsEnabled) {
        showTooltip('Nema vise grupa!');
        return;
    }
  
    const groupId = prompt('Novi ID grupe (IME):');
    if (!groupId || groupId.trim() === '') {
      showTooltip('Ime grupe obavezno!');
      return;
    }
    if (groups.find(group => group.id === groupId)) {
      showTooltip('Ime grupe vec postoji!');
      return;
    }
    const groupColor = getRandomColor(); // boja za grupu (nije skroz random, ima lista)
    currentGroup = {
        id: groupId,
        selectedSeats: [],
        color: groupColor,
    };

    document.getElementById('startButton').disabled = true;
    document.getElementById('finishButton').disabled = false;
    document.getElementById('noMoreGroupsButton').disabled = true;
    updateGroupInfo();
    groups.push(currentGroup);
    showTooltip(`Grupa ${groupId} sada bira sedista!`);
    
}
// tampon zona check i mark
function applyTamponeZone(sit) {
    const row = sit.row;
    const col = sit.col;

    // sedista pored svi pravci (buffer zone)
    const adjacentSeats = [
        { row: row - 1, col: col }, // iznad
        { row: row + 1, col: col }, // ispod
        { row: row, col: col - 1 }, // levo
        { row: row, col: col + 1 },  // desno

        { row: row - 1, col: col - 1 }, // gore levo
        { row: row - 1, col: col + 1 }, // gore desno
        { row: row + 1, col: col - 1 }, // dole levo
        { row: row + 1, col: col + 1 } // dole desno
    ];
// provera
    adjacentSeats.forEach(({ row, col }) => {
        if (row > 0 && row <= x && col > 0 && col <= y) {
            const adjacentSit = sitsArray.find(s => s.row === row && s.col === col);
            if (adjacentSit && !adjacentSit.selected && !adjacentSit.reserved) {
                const sitElement = document.getElementById(`${row}-${col}`);
                sitElement.classList.add('tampone');  // buffer zona
                adjacentSit.tampone = true;  // obelezi kao tampon zonu

                // obelezi rezervisano za sledecu grupu
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
        return 300; // prvi i poslednji uvek 300
    }
    if (totalRows % 2 === 0) {
    //    parno

        if (row === midRow || row === midRow + 1) {
            return 500; // srednji uvek  500 i ovo + 1 je da su dva reda
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
        // else je neparno
        if (row === midRow) {
          return 500; // srednji red uvek 500
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
// update group info
function updateGroupInfo() {
    if (currentGroup) {
        document.getElementById('groupInfo').innerText = `Grupa ${currentGroup.id} bira sedista.`;
    } else {
        document.getElementById('groupInfo').innerText = `Nema aktivne grupe.`;
    }
}

// update stat
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
    tbody.innerHTML = ''; // cisti trenutno
 
    groups.forEach(group => {
        const row = document.createElement('tr');
        const groupName = document.createElement('td');
        groupName.style.backgroundColor = group.color; 
        groupName.innerText = group.id;
        const selectedSeats = document.createElement('td');
        // selectedSeats.innerText = group.selectedSeats.length;
       
        const percentage = Math.round((group.selectedSeats.length / (x * y)  * 100) );
        selectedSeats.style.background =  `linear-gradient(90deg, ${group.color} ${percentage}% , transparent 0%)`;
        selectedSeats.textContent = `${group.selectedSeats.length} (${percentage}%)`;
        const revenue = document.createElement('td');
        revenue.style.backgroundColor = group.color; 
        revenue.innerText = group.selectedSeats.reduce((acc, sit) => acc + sit.price, 0);
        row.appendChild(groupName);
        row.appendChild(selectedSeats);
        row.appendChild(revenue);
        tbody.appendChild(row);
    });
}


let colors = ['#645986' ,'#cf4647', '#005689',  '#f96d00', '#6643b5', '#014955', '#5da7ae','#02C3BD', '#FF8C61' ]; // Red, Blue, Green

function getRandomColor() {
    if (colors.length === 0) {
        // Reset za array 
        colors = ['#645986', '#cf4647', '#005689',  '#f96d00', '#6643b5', '#014955', '#5da7ae','#02C3BD', '#FF8C61'];
    }
    // random index
    const randomIndex = Math.floor(Math.random() * colors.length);
    const selectedColor = colors[randomIndex];
    // ponavljanje
    colors.splice(randomIndex, 1);

    return selectedColor;
}

function noMoreGroups() {
    groupsEnabled = false;
 
    document.getElementById('startButton').disabled = true;
    document.getElementById('finishButton').disabled = true;
    document.getElementById('noMoreGroupsButton').disabled = true;
    showTooltip('Nema vise grupa! Ostala sedista su zauzeta.');

    grabRemainingSeats();
    document.getElementById('groupInfo').innerText = `Nema vise grupa!`;
    document.getElementById('container').className = 'done';
    document.getElementsByClassName('buttons-wrapper')[0].className = 'buttons-wrapper done';
    document.getElementsByClassName('screen-wrapper')[0].className = 'screen-wrapper done';
    document.getElementsByClassName('screen')[0].className = 'screen done';

    document.getElementById('toogleSeatNum').disabled = false;
    document.getElementById('toogleSeatNum').classList.remove('disabled');
    document.getElementById('toogleSeatPrice').disabled = false;
    document.getElementById('toogleSeatPrice').classList.remove('disabled');
}


function grabRemainingSeats() {
    sitsArray.forEach(sit => {
        if (!sit.selected && !sit.reserved) {
            // mark grabbed
            sit.reserved = true;
            const sitElement = document.getElementById(`${sit.row}-${sit.col}`);
            sitElement.style.backgroundColor = 'gray';  
            sitElement.classList.add('reserved');  
        }
    });

    // update stat
    updateStatistics();
}
// tooltip "modal"
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
const videos = [
    "https://www.youtube.com/embed/80VTmBAnTSE?autoplay=1&mute=1&loop=1&playlist=80VTmBAnTSE",
    "https://www.youtube.com/embed/d6R-ZjEgnlo?autoplay=1&mute=1",
    "https://www.youtube.com/embed/urHvTZWO_70?autoplay=1&mute=1"
];

let currentIndex = 0;

const iframe = document.getElementById("videoIframe");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

function updateVideo() {
    iframe.src = videos[currentIndex];
}

prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
        currentIndex--;
    } else {
        currentIndex = videos.length - 1; // Loop back to last video
    }
    updateVideo();
});

nextBtn.addEventListener("click", () => {
    if (currentIndex < videos.length - 1) {
        currentIndex++;
    } else {
        currentIndex = 0; // Loop back to first video
    }
    updateVideo();
});

// Initial load
updateVideo();

// Chek za local storage
// local storage da se vidi sa nikolom
if (typeof(Storage) !== "undefined") {

    console.log("Local Storage is supported");
  
  } else {
  
    console.log("Local Storage is not supported in your browser");
  
  }


  function toggleSeatNum() {
    const sitPositions = document.getElementsByClassName('sit-position'); // Remove the dot (.) before the class name
    const button = document.getElementById('toggleSeatNum');
    // Convert HTMLCollection to an array and use forEach
    Array.from(sitPositions).forEach(sitPosition => {
        sitPosition.classList.toggle('sit-hidden');
    });
    button.classList.toggle('active');
}
function toggleSeatPrice() {
    const sitPositions = document.getElementsByClassName('sit-price'); // Remove the dot (.) before the class name
  const button = document.getElementById('toggleSeatPrice');
    // Convert HTMLCollection to an array and use forEach
    Array.from(sitPositions).forEach(sitPrice => {
        sitPrice.classList.toggle('sit-hidden');
    });

    button.classList.toggle('active');
}