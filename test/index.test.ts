import { readFile } from 'fs/promises';
import { ModelApi, ModelLoader, SGraph } from '../src';
import * as echartsData from './echarts';

describe('SGraph.js', () => {
  let model: SGraph;
  let modelApi: ModelApi;

  describe('test ModelLoader', () => {
    test('load model from xml', async () => {
      const modelLoader = new ModelLoader();
      const loadedModel = await modelLoader.load('test/modelfile.xml');
      if (loadedModel) model = loadedModel;
      expect(model).toBeDefined();
    });

    test('load model from zip', async () => {
      const modelLoader = new ModelLoader();
      const loadedModel = await modelLoader.load('test/modelfile.xml.zip');
      expect(loadedModel).toBeDefined();
    });
  });

  describe('test ModelApi', () => {
    test('create ModelApi from model', () => {
      modelApi = new ModelApi({
        model,
      });
      expect(modelApi).toBeDefined();
    });

    test('create ModelApi from xml', async () => {
      const data = await readFile('test/modelfile.xml', 'utf8');
      const modelApi = new ModelApi({
        data,
      });
      expect(modelApi).toBeDefined();
    });

    test('find two index.js files by name', () => {
      const files = modelApi.getElementsByName('index.js');
      expect(files.length).toBe(2);
    });
  });

  describe('test SGraph', () => {
    test('find dir from path', () => {
      const foundElement = model.findElementFromPath('mock-project/src/utils');
      expect(foundElement?.name).toBe('utils');
    });

    test('find file from path', () => {
      const foundElement = model.findElementFromPath(
        'mock-project/src/database/models.js'
      );
      expect(foundElement?.name).toBe('models.js');
    });
  });

  describe('test converters', () => {
    test('ECharts converter gives the right output', () => {
      const ec = model.toEcharts();
      expect(ec.categories).toMatchObject(echartsData.categories);
      expect(ec.nodes).toMatchObject(echartsData.nodes);
      expect(ec.links).toMatchObject(echartsData.links);
    });
  });

  describe('check properties', () => {
    test('project name is mock-project', () => {
      const projectName = model.rootNode.children[0].name;
      expect(projectName).toBe('mock-project');
    });

    test('project has two children in childrens', () => {
      const childrens = model.rootNode.children[0].children.length;
      expect(childrens).toBe(2);
    });

    test('project has two children in childrenObject', () => {
      const childrens = Object.keys(
        model.rootNode.children[0].childrenObject
      ).length;
      expect(childrens).toBe(2);
    });
  });

  describe('check things existing in correct places', () => {
    test('src and package.json exist as a child of the project', () => {
      const project = modelApi.egm.rootNode.children[0];
      expect(project.children).toContainEqual(
        expect.objectContaining({
          name: 'src',
        })
      );
      expect(project.children).toContainEqual(
        expect.objectContaining({
          name: 'package.json',
        })
      );
      expect(project.childrenObject.src).toBeDefined();
      expect(project.childrenObject['package.json']).toBeDefined();
    });

    test('utils is a child of the src directory', () => {
      const src = modelApi.egm.rootNode.children[0].childrenObject.src;
      expect(src.children).toContainEqual(
        expect.objectContaining({
          name: 'utils',
        })
      );
      expect(src.childrenObject.utils).toEqual(
        expect.objectContaining({
          name: 'utils',
        })
      );
    });
  });

  describe('check dependencies', () => {
    test('utils/math.js is outgoing dependency for src/index.js', () => {
      const index =
        modelApi.egm.rootNode.children[0].childrenObject.src.childrenObject[
          'index.js'
        ];
      expect(index.outgoing).toContainEqual(
        expect.objectContaining({
          toElement: expect.objectContaining({
            name: 'math.js',
          }),
        })
      );
    });
  });
});
