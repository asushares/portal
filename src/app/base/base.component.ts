// Author: Preston Lee

import { Patient } from "fhir/r5";

export class BaseComponent {

    canMoveUp<T>(item: T, within: Array<T>): boolean {
        return within.indexOf(item) > 0;
    }

    canMoveDown<T>(item: T, within: Array<T>): boolean {
        return within.indexOf(item) < within.length - 1;
    }

    moveUp<T>(item: T, within: Array<T>): void {
        if (within.length > 1) {
            let i: number = within.indexOf(item, 0);
            if (i > 0) {
                let tmp: T = within[i - 1];
                within[i - 1] = within[i];
                within[i] = tmp;
            }

        }
    }

    moveDown<T>(item: T, within: Array<T>): void {
        if (within.length > 1) {
            let i: number = within.indexOf(item, 0);
            if (i < within.length - 1) {
                let tmp: T = within[i + 1];
                within[i + 1] = within[i];
                within[i] = tmp;
            }
        }
    }

    nameFor(p: Patient): any {
        let name = '(None)';
        if (p.name && p.name.length > 0) {
            let tmp = [];
            if (p.name[0].given) {
                tmp.push(...p.name[0].given);
            }
            if (p.name[0].family) {
                tmp.push(p.name[0].family);
            }
            name = tmp.join(' ');
        }
        return name;
    }

}
