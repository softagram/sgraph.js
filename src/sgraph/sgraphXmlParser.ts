import sax from 'sax';
import { SElement, SElementAssociation } from '../selement';

export default class SGraphXMLParser {
  idStack: string[] = [];
  rootNode: SElement;
  elemStack: SElement[] = [];
  currentElement?: SElement;
  currentElementPath?: string;
  idToElemMap: { [key: string]: SElement } = {};
  currentRelation?: { [key: string]: any };
  currentElementOutgoingDeps: SElementAssociation[] = [];
  acceptableAssocTypes = new Set();
  ignoreAssocTypes = new Set();
  ignoredAttributes;
  onlyRoot;

  parser = sax.parser();

  constructor(ignoredAttributes?: any[], onlyRoot?: boolean) {
    this.ignoredAttributes = ignoredAttributes || [];
    this.onlyRoot = onlyRoot;
    this.rootNode = new SElement('', undefined);

    this.parser.onopentag = this.onopentag;
    this.parser.onclosetag = this.onclosetag;
  }

  parse(xml: any) {
    this.parser.write(xml).close();
  }

  setTypeRules(typeRules: string[]) {
    for (let typeRule of typeRules) {
      typeRule = typeRule.trim();
      if (typeRule.startsWith('IGNORE ')) {
        this.ignoreAssocTypes.add(typeRule.substring(7).trim());
      } else {
        this.acceptableAssocTypes.add(typeRule);
      }
    }
  }

  onopentag = (tag: sax.Tag | sax.QualifiedTag) => {
    let { name, attributes } = tag;
    name = name.toString().toLowerCase();

    if (name === 'a') {
      let { N: name, V: value } = attributes;
      name = name.toString();
      value = value.toString();

      if (this.currentRelation) this.currentRelation[name] = value;
      else {
        if (
          this.currentElement &&
          this.currentElementPath &&
          this.currentElementPath.length > 0 &&
          !(name in this.ignoredAttributes)
        ) {
          this.currentElement.addAttribute(name, value);
        }
      }
    } else if (name === 'e') {
      let { N: name } = attributes;
      name = name.toString();

      let e: SElement;
      if (this.idStack.length <= 0) e = new SElement(name, this.rootNode);
      else e = new SElement(name, this.elemStack.at(-1));

      this.currentElement = e;
      this.idStack.push(name);
      this.currentElementPath = '/' + this.idStack.join('/');
      this.elemStack.push(this.currentElement);

      for (let [aname, avalue] of Object.entries(attributes)) {
        aname = aname.toLowerCase();
        if (aname === 't' || aname === 'type') {
          this.currentElement.setType(avalue);
        } else if (aname === 'i') {
          this.idToElemMap[avalue] = this.currentElement;
        } else if (aname !== 'n' && !(aname in this.ignoredAttributes)) {
          this.currentElement.addAttribute(aname, avalue);
        }
      }

      if (this.onlyRoot) {
        throw new ParsingIntentionallyAborted('Aborted intentionally');
      }
    } else if (name === 'r') {
      this.currentRelation = {};
      let { R: referred, T: t } = attributes;
      referred = referred.toString();
      t = t.toString();

      if (referred.includes(',')) {
        for (let referred_ of referred.split(',')) {
          this.createReference(referred_, t);
        }
      } else {
        this.createReference(referred, t);
      }

      for (let [aname, avalue] of Object.entries(attributes)) {
        if (aname.length > 1) {
          this.currentRelation[aname] = avalue;
        }
      }
    }
  };
  onclosetag = (tag: string) => {
    tag = tag.toLowerCase();

    if (tag === 'e') {
      this.idStack.pop();
      this.elemStack.pop();
      if (this.elemStack.length > 0) {
        this.currentElement = this.elemStack.at(-1);
        this.currentElementPath = '/' + this.idStack.join('/');
      }
    } else if (tag === 'r') {
      if (this.currentElementOutgoingDeps) {
        for (let x of this.currentElementOutgoingDeps) {
          if (this.currentRelation) x.setAttrMap(this.currentRelation);
          this.currentElement?.outgoing.push(x as any);
        }
        this.currentElementOutgoingDeps = [];
      }
      this.currentRelation = undefined;
    }
  };

  createReference(i: string, t: string) {
    if (!this.acceptableAssocTypes && this.ignoreAssocTypes) {
      if (t in this.ignoreAssocTypes) return;
    } else if (!this.acceptableAssocTypes || t in this.acceptableAssocTypes) {
    } else if (
      this.acceptableAssocTypes &&
      this.acceptableAssocTypes.size === 0
    ) {
      // return;
    } else {
      return;
    }

    const dep = new SElementAssociation(undefined, undefined, '', {});

    if (i === '0') {
      console.error('zero as ref id');
    }

    dep.fromElement = this.currentElement!;
    dep.toElement = i as any;
    dep.deptype = t;
    this.currentElementOutgoingDeps.push(dep);
  }

  translateReferences = () => {
    const stack = [this.rootNode];

    let r = 0;
    while (stack.length > 0) {
      const elem = stack.shift();
      r += 1;
      if (elem?.outgoing) {
        for (let ea of elem.outgoing as any) {
          if (ea.toElement in this.idToElemMap) {
            ea.toElement = this.idToElemMap[ea.toElement];
            ea.toElement.incoming.push(ea);
          } else {
            console.error(`Error: unknown id ${ea.toElement} n=${elem.name}`);
            throw new Error(`Error: unknown id in input data: ${ea.toElement}`);
          }
        }
      }

      if (elem?.children) {
        for (let child of elem.children) {
          stack.push(child);
        }
      }
    }
  };
}

class ParsingIntentionallyAborted extends Error {
  constructor(message: string) {
    super(message);
  }
}
