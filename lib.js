class Character {
  constructor(callback) {
    this.nickname = '';
    this.icons = [];

    if (window.location.pathname == '/kk/a_chara.php') {
      this.parseDocument(document, callback);
    } else {
      chrome.storage.local.get(['nickname', 'icons'], (items) => {
        if (typeof items.nickname === 'undefined' || this.nickname === null) {
          this.fetchCharacter(callback);
          return;
        }
        this.nickname = items.nickname;
        this.icons = items.icons;
        callback(this);
      });
    }
  }

  fetchCharacter(callback) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/kk/a_chara.php');
    xhr.responseType = 'document';
    xhr.onreadystatechange = () => {
      if (xhr.readyState == 4) {
        this.parseDocument(xhr.responseXML, callback);
      }
    };
    xhr.send();
  }

  parseDocument(doc, callback) {
    this.nickname = doc.querySelector('input[name="ai"]').getAttribute('value');
    doc.querySelectorAll('input[name^="in"]').forEach((input, i) => {
      this.icons.push(new Icon());
      if (input.value != '') this.icons[i].name = input.value;
    });
    doc.querySelectorAll('input[name^="icon"]').forEach((input, i) => {
      if (input.value != '') this.icons[i].url = input.value;
    });
    doc.querySelectorAll('input[name^="icai"]').forEach((input, i) => {
      if (input.value != '') this.icons[i].speaker = input.value;
    });

    chrome.storage.local.set({'nickname': this.nickname, 'icons': this.icons}, () => {
      callback(this);
    });
  }
}

class Icon {
  constructor() {
    this.name = null;
    this.url = null;
    this.speaker = null;
  }
}

class MessagePreview {
  constructor(parentNode, character) {
    this.iconNo = null;
    this.rawText = null;
    this.letters = 0;
    this.lettersMax = 400;
    this.placeholder = '(ここにプレビューが表示されます。)';
    this.timerId = null;
    this.character = character;
    this.textInput = parentNode.querySelectorAll('input[type="text"]')[0];
    this.iconSelect = parentNode.querySelector('select');
    this.previewArea = this.createPreviewArea();

    this.addEventListeners();
    this.initializePreview();
  }

  createPreviewArea() {
    let element = document.createElement('div');
    element.className = 'SE';
    element.textContent = this.placeholder;
    return element;
  }

  addEventListeners() {
    this.textInput.addEventListener('focus', this.startMonitoring.bind(this));
    this.textInput.addEventListener('blur', this.endMonitoring.bind(this));
    this.iconSelect.addEventListener('change', this.getIconNo.bind(this));
  }

  initializePreview() {
    this.rawText = this.textInput.value;
    this.getIconNo();
  }

  startMonitoring() {
    this.endMonitoring();
    this.timerId = setInterval(()=> {
      this.monitorInput();
    }, 200);
  }

  endMonitoring() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  monitorInput() {
    let text = this.textInput.value;
    if (text != this.rawText) {
      this.execute(this.iconNo, text);
    }
  }

  getIconNo() {
    let numberString = this.iconSelect.value;
    let iconNo;
    if (numberString === '') {
      iconNo = 0;
    } else {
      iconNo = parseInt(numberString);
    }
    if (iconNo != this.iconNo) {
      this.execute(iconNo, this.rawText);
    }
  }

  execute(iconNo, text) {
    this.iconNo = iconNo;
    this.rawText = text;
    let output = this.convert(text);
    this.render(output);
  }

  convert(source) {
    if (source == '') return null;

    let result = [];
    // ###で区切られた中からランダムに１つだけ発します。
    source.split('###').forEach((data, i) => {
      // +++で区切られたセリフを連続で発します。処理は###での区切りが先です。
      result[i] = [];
      data.split('+++').forEach((data, j) => {
        result[i][j] = this.buildMessage(data);
      });
    });

    return result;
  }

  buildMessage(source) {
    let message = new Message();
    let iconRegExp = /^\/(\d+)\//,
      speakerRegExp = /^@(.*?)@/,
      fontRegExp = /&lt;([FISU][1-7])&gt;.*&lt;\/[FISU][1-7]&gt;/,
      brRegExp = /&lt;BR&gt;/g;

    // HTMLタグをエスケープ
    source = source.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // /アイコン番号/ セリフのアイコンを変更します。発言者変更と同時に使う場合にはアイコン変更のほうを先に書きます。
    let result = iconRegExp.exec(source);
    if (result !== null) {
      let iconIndex = parseInt(result[1]);
      message.icon = this.character.icons[iconIndex];
      source = source.replace(iconRegExp, '');
    } else {
      message.icon = this.character.icons[this.iconNo];
    }

    // @発言者@ セリフの発言者名を変更します。@@とすると発言者名が消えて「」も消えます。
    result = speakerRegExp.exec(source);
    if (result !== null) {
      message.speaker = result[1];
      source = source.replace(speakerRegExp, '');
    } else {
      if (message.icon.speaker !== null) {
        message.speaker = message.icon.speaker;
      } else {
        message.speaker = this.character.nickname;
      }
    }

    // 文字装飾
    let pos = 0;
    while (result = fontRegExp.exec(source.substring(pos))) {
      let fontRegExp2 = new RegExp(`&lt;${result[1]}&gt;(.*)&lt;/${result[1]}&gt;`);
      let result2 = fontRegExp2.exec(source.substring(pos));
      if (result2 !== null) {
        source = source.replace(fontRegExp2, this.decorativeTag(result[1], result2[1]));
      } else {
        pos += result.index + 1;
      }
    }

    // <BR> セリフの途中で改行します。
    message.text = source.replace(brRegExp, '<br>');
    return message;
  }

  decorativeTag(tag, content) {
    let tagType;
    switch (tag[0]) {
      case 'F':
        tagType = 'b';
        break;
      case 'I':
        tagType = 'i';
        break;
      case 'S':
        tagType = 's';
        break;
      case 'U':
        tagType = 'u';
        break;
    }
    return `<${tagType} class="F${tag[1]}">${content}</${tagType}>`;
  }

  render(data) {
    if (data == null) {
      this.previewArea.textContent = this.placeholder;
      return;
    }
    this.toEmpty();

    // 〜または〜
    for (let messages of data) {
      // 連続セリフ
      for (let message of messages) {
        let table = document.createElement('table');
        let tr = document.createElement('tr');
        tr.setAttribute('valign', 'top');
        let td = document.createElement('td');
        td.setAttribute('width', '60');
        td.appendChild(message.outputIcon());
        tr.appendChild(td);

        td = document.createElement('td');
        td.className = 'BG';
        td.innerHTML = message.outputText();
        tr.appendChild(td);
        table.appendChild(tr);

        this.previewArea.appendChild(table);
        this.previewArea.appendChild(this.separator());
      }
      this.previewArea.removeChild(this.previewArea.lastChild);

      this.previewArea.appendChild(this.separator('--- または ---'));
    }
    this.previewArea.removeChild(this.previewArea.lastChild);
  }

  separator(textNode = null) {
    let separator = document.createElement('div');
    separator.className = 'CL';
    if (textNode !== null) separator.textContent = textNode;
    return separator;
  }

  toEmpty() {
    while (this.previewArea.firstChild) {
      this.previewArea.removeChild(this.previewArea.firstChild);
    }
  }
}

class Message {
  constructor() {
    this.icon = null;
    this.speaker = null;
    this.text = null;
  }

  outputIcon() {
    let img = document.createElement('img');
    if (this.icon.url === null) {
      img.setAttribute('src', '/kk/p/np2.gif');
    } else {
      img.setAttribute('src', this.icon.url);
    }
    img.className = 'IC';
    return img;
  }

  outputText() {
    // 発言者タグで @@ を指定した場合は「」を外す
    if (this.speaker === '') {
      return this.text;
    } else {
      return `${this.speaker}<br>「${this.text}」`;
    }
  }
}
