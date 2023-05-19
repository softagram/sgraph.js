import { NOT_KNOWN_TYPE, SElement, SElementAssociation } from '../selement';

const isNumeric = (string: string) => {
  return !isNaN(parseInt(string));
};

export const encodeAttributeName = (n: any) => {
  if (isNumeric(n[0])) {
    return '_' + n;
  }
  return n;
};

export const encodeAttributeValue = (v: any) => {
  if (v) {
    // https://www.w3.org/TR/xml/#NT-AttValue
    // Forbidden chars are: naked ampersand, left angle bracket, double quote
    // single quote is fine as we are using double quotes in XML for attributes
    v = v.toString('utf8');
    return v
      .replace('&', '&amp;')
      .replace('<', '&lt;')
      .replace('>', '&gt;')
      .replace('\n', '&' + '#' + '10;')
      .replace('"', '&quot;');
  }
  return '';
};

export const getAttributeString = (
  attributes: { [key: string]: string | string[] },
  elementType: string,
  currentIndent: string
) => {
  const elementAttributes = Object.entries(attributes).filter(
    (attribute) => !attribute[0].startsWith('_tmp_attr_')
  );
  const sortedAttrs = elementAttributes.sort();
  const attrs = sortedAttrs.map((x) => {
    if (x[0] != 'type') {
      return (
        encodeAttributeName(x[0]) + '="' + encodeAttributeValue(x[1]) + '"'
      );
    } else {
      return '';
    }
  });
  let attributeString = ' '.concat(attrs.join(' '));

  if (elementType !== '' && elementType !== NOT_KNOWN_TYPE) {
    attributeString =
      ' t="' + elementType + '"\n' + currentIndent + '  ' + attributeString;
  } else if (attributeString.trim()) {
    attributeString = '\n' + currentIndent + '  ' + attributeString;
  }
  return attributeString;
};

export const groupElementAssociations = (
  associations: SElementAssociation[]
) => {
  const easmap: { [key: string]: SElementAssociation[] } = {};
  associations.forEach((association) => {
    const attributes = JSON.stringify(association.getAttributes());

    const k =
      association.deptype !== undefined
        ? attributes + association.deptype
        : attributes;

    if (Object.keys(easmap).includes(k)) {
      easmap[k].push(association);
    } else {
      easmap[k] = [association];
    }
  });

  return Object.entries(easmap).map(([k, v], i) => {
    return { associationlist: v, deptype: v[0].deptype, attrs: v[0].attrs };
  });
};

export class Counter {
  i: number;
  constructor() {
    this.i = 1;
  }

  now() {
    this.i += 1;
    return this.i;
  }
}

export const elementSort = (a: SElement, b: SElement): number => {
  const str1 = a.name;
  const str2 = b.name;
  return str1 < str2 ? -1 : +(str1 > str2);
};
