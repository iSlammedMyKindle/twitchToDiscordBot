class linkedListNode {

    data;
    next = null;
    prev = null;

    constructor(data){
        this.data = data;
    }

    /**
     * Grabs an item from the linked list based on this node's posistion, either backward or forwards
     * @param {number} index Grab items that are before this one, or after this one. A postive index takes you forward, and a negative index brings you back. it's possible for a undefined value to exist.
     * @param {boolean} isForward false traverses backwards, true goes forwards
     */
    getItemAt(index = 0, isForward = true){

        if(index === 0) return this;

        if(index < 0) return null;
        
        const key = ['prev', 'next'][isForward * 1];
        
        if(this[key] && index)
            return this[key].getItemAt(--index, isForward);

        return null;
    }

    get beg(){
        if(this.prev != null)
            return this.prev.beg;

        return this;
    }

    get end(){
        if(this.next != null)
            return this.next.end;

        return this;
    }
}

class nodeInterface {
    //The node that was last made using `addNode`; should always be the last node in the list.
    lastCreatedNode;

    constructor(data){
        if(data) this.lastCreatedNode = new linkedListNode(data);
    }

    /**
     * 
     * @param {*} data - the data that will be inserted into the new linked list node.
     * @returns The new node that was created, it will also be placed inside `lastCreatedNode`
     */
    addNode(data){
        const newNode = new linkedListNode(data);
        newNode.prev = this.lastCreatedNode;

        this.lastCreatedNode.next = newNode;

        //Shift the last created node to our new one.
        this.lastCreatedNode = newNode;

        return newNode;
    }

     /**
     * Basically prepare this node for deletion, once this is done, memory management from js will need to take care of this after a `delete` call
     */
      rebindForDelete(targetNode){
        targetNode.next.prev = targetNode.prev;
        targetNode.prev.next = targetNode.next;

        //If this is the last linked node in the list, grab it's previous node instead to make that the "lastCreatedNode" (credit - bevelled from twitch)
        if(this.lastCreatedNode == targetNode)
            this.lastCreatedNode = targetNode.prev;

    }

}

module.exports = { linkedListNode, nodeInterface };