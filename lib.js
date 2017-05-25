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
    this.textInput = parentNode.querySelector('input[name^="se"]');
    this.iconSelect = parentNode.querySelector('select');
    this.previewArea = this.createPreviewArea();

    this.addEventListeners();
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
    this.iconSelect.addEventListener('change', this.monitorIconNo.bind(this));
  }

  init() {
    let text = this.textInput.value;
    let iconNo = this.getIconNo();
    this.execute(iconNo, text);
  }

  startMonitoring() {
    this.endMonitoring();
    this.timerId = setInterval(() => {
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
    if (numberString === '') {
      return 0;
    } else {
      return parseInt(numberString);
    }
  }

  monitorIconNo() {
    let iconNo = this.getIconNo();
    if (iconNo !== this.iconNo) {
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
    Util.toEmpty(this.previewArea);

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
        this.previewArea.appendChild(Util.separator());
      }
      this.previewArea.removeChild(this.previewArea.lastChild);

      this.previewArea.appendChild(Util.separator('--- または ---'));
    }
    this.previewArea.removeChild(this.previewArea.lastChild);
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


class StagingPreview {
  constructor(parentNode) {
    this.rawUrl = null;
    this.imageUrlInput = parentNode.querySelector('input[name^="en"]');

    this.previewArea = this.createPreviewArea();
    this.imageUrlInput.addEventListener('blur', this.monitorInput.bind(this));
  }

  init() {
    this.monitorInput();
  }

  monitorInput() {
    let url = this.imageUrlInput.value;
    if (url !== this.rawUrl) {
      let images = this.convert(url);
      this.render(images);
    }
  }

  convert(source) {
    let images = [];
    // 各演出画像の設定はURLを複数設定できます。複数設定する場合は ### で区切ってください。
    let heightRegExp = /@(\d+)$/, urlRegExp = /^https?:\/\//;
    for (let str of source.split('###')) {
      // 演出画像URLのすぐ後に、例えば @300 と付けることで高さ300pxで表示できます。
      let staging = new Staging();
      let result = heightRegExp.exec(str);
      if (result !== null) {
        let h = parseInt(result[1]);
        if (0 < h && h <= 600) {
          staging.height = h;
        }
        str = str.replace(heightRegExp, '');
      }
      if (!urlRegExp.test(str)) continue;
      staging.url = str;

      images.push(staging);
    }

    return images;
  }

  render(images) {
    Util.toEmpty(this.previewArea);
    for (let image of images) {
      let img = document.createElement('img');
      img.setAttribute('src', image.url);
      img.setAttribute('width', '600');
      img.setAttribute('height', image.height);
      this.previewArea.appendChild(img);
      this.previewArea.appendChild(Util.separator('--- または ---'));
    }
    if (this.previewArea.lastChild) this.previewArea.removeChild(this.previewArea.lastChild);
  }

  createPreviewArea() {
    let element = document.createElement('div');
    element.className = 'CL';
    return element;
  }
}

class Staging {
  constructor() {
    this.url = null;
    this.height = 200;
  }
}

class Util {
  static toEmpty(dom) {
    while (dom.firstChild) {
      dom.removeChild(dom.firstChild);
    }
  }

  static separator(textNode = null) {
    let separator = document.createElement('div');
    separator.className = 'CL';
    if (textNode !== null) separator.textContent = textNode;
    return separator;
  }
}
