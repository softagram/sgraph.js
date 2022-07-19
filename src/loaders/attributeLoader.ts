import AdmZip from 'adm-zip';
import { readFile } from 'fs/promises';
import path from 'path';
import { SGraph } from '../sgraph';
import { readAttrsGeneric } from '../attributes';

const attrFiles = [
  'attr_temporary.csv',
  'git/attr_git_propagated.csv',
  'git/attr_analysis_state.csv',
  'content/loc/attr_loc_propagated.csv',
  'content/loc/attr_testcode_loc_propagated.csv',
  'content/loc/attr_languages.csv',
  'content/attr_licenses.csv',
  'attr_issue_propagated.csv',
  'content/attr_risk_level.csv',
  'content/attr_pmd.csv',
];

class AttributeLoader {
  loadAttrFile(data: string, model: SGraph) {
    const { columns, entries } = readAttrsGeneric(data);
    for (let [elemPath, attrs] of entries) {
      for (let column of columns) {
        const value = attrs[column];
        model.createOrGetElementFromPath(elemPath).addAttribute(column, value);
      }
    }

    return model;
  }

  async loadAllFiles(filePathOfModelRoot: string, model: SGraph) {
    const missingAttrFiles: string[] = [];

    for (let attrFile of attrFiles) {
      const filePath = `${filePathOfModelRoot}/${attrFile}`;
      try {
        const zip = new AdmZip(`${filePath}.zip`);
        const data = zip.readAsText(path.basename(filePath));
        this.loadAttrFile(data, model);
      } catch {
        try {
          const file = await readFile(filePath, 'utf-8');
          this.loadAttrFile(file, model);
        } catch {
          missingAttrFiles.push(attrFile);
        }
      }
    }

    return {
      model,
      missingAttrFiles,
    };
  }
}

export { AttributeLoader };
