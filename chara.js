let main = (character) => {
  let hasStaging = [0, 1, 11];
  for (let i = 1; i <= 8; i++) {
    let tbody = document.getElementById(`CL5${i}`).firstChild;
    let j, jmax;
    if (i <= 1 || 5 <= i) {
      jmax = 17;
    } else {
      jmax = 11;
    }

    for (j = 0; j <= jmax; j++) {
      let input = document.getElementById(`se${j}-${i}`);
      let container = input.parentNode.parentNode;
      let messagePreview = new MessagePreview(container, character);

      let tr = document.createElement('tr');
      let spacer = document.createElement('td');
      tr.appendChild(spacer);
      let td = document.createElement('td');
      td.setAttribute('colspan', '3');
      td.appendChild(messagePreview.previewArea);
      tr.appendChild(td);

      let rows = hasStaging.includes(j) ? 2 : 1;
      let rCount = 0;
      let referenceNode = container;
      while (rCount < rows) {
        while (referenceNode = referenceNode.nextSibling) {
          if (referenceNode.nodeType === 1) break;
        }
        rCount++;
      }

      tbody.insertBefore(tr, referenceNode);
      messagePreview.init();

      if (hasStaging.includes(j)) {
        let input = document.getElementById(`en${j}-${i}`);
        let container = input.parentNode.parentNode;
        let stagingPreview = new StagingPreview(container);

        td.appendChild(stagingPreview.previewArea);
        stagingPreview.init();
      }
    }
  }
};

new Character(main);
