let main = (character) => {
  for (let i = 1; i <= 8; i++) {
    let tbody = document.getElementById(`CL5${i}`).firstChild;
    let j, jmax;
    if (i <= 1 || 5 <= i) {
      jmax = 17;
    } else {
      jmax = 11;
    }

    for (j = 0; j <= jmax; j++) {
      let input = tbody.querySelector(`#se${j}-${i}`);
      let container = input.parentNode.parentNode;
      let messagePreview = new MessagePreview(container, character);

      let tr = document.createElement('tr');
      let spacer = document.createElement('td');
      spacer.setAttribute('colspan', '2');
      tr.appendChild(spacer);
      let td = document.createElement('td');
      td.setAttribute('colspan', '2');
      td.appendChild(messagePreview.previewArea);
      tr.appendChild(td);

      let referenceNode = container.nextSibling;
      while (referenceNode) {
        if (referenceNode.nodeType == 1) break;
        referenceNode = referenceNode.nextSibling;
      }

      tbody.insertBefore(tr, referenceNode);
    }
  }
};

new Character(main);
