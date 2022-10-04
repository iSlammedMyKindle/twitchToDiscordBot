declare function getItemAt<Type>(index: number, isForward: boolean): null | linkedListNode<Type> | typeof getItemAt;

class linkedListNode<Type>
{

    public data: Type | undefined;
    public next: linkedListNode<Type> | null | undefined = null;
    public prev: linkedListNode<Type> | null | undefined = null;

    constructor(data?: Type)
    {
        if(data)
            this.data = data;
    }

    /**
     * Grabs an item from the linked list based on this node's posistion, either backward or forwards
     * @param {number} index Grab items that are before this one, or after this one. A postive index takes you forward, and a negative index brings you back. it's possible for a undefined value to exist.
     * @param {boolean} isForward false traverses backwards, true goes forwards
     */
    getItemAt(index: number = 0, isForward: boolean = true): typeof getItemAt<Type> | null | this
    {

        if(index === 0) return this;

        if(index < 0) return null;

        const key: string = isForward ? 'prev' : 'next';

        if(this[key as keyof linkedListNode<Type>] && index)
            return (this[key as keyof linkedListNode<any>] as any)!.getItemAt(--index, isForward);

        return null;
    }

    get beg(): linkedListNode<Type>
    {
        if(this.prev !== null)
            return this.prev!.beg;

        return this;
    }

    get end(): linkedListNode<Type>
    {
        if(this.next !== null)
            return this.next!.end;

        return this;
    }
}

class nodeInterface<Type>
{
    // The node that was last made using `addNode`; should always be the last node in the list.
    public lastCreatedNode: linkedListNode<Type> | undefined | null;
    public beginningNode: linkedListNode<Type> | undefined | null;

    constructor(data?: Type)
    {
        if(data)
            this.beginningNode =
                this.lastCreatedNode =
                new linkedListNode(data);
    }

    /**
     * @param {*} data - the data that will be inserted into the new linked list node.
     * @returns The new node that was created, it will also be placed inside `lastCreatedNode`
     */
    addNode(data?: Type)
    {
        const newNode = new linkedListNode<Type>(data as Type);
        newNode.prev = this.lastCreatedNode;

        if(this.lastCreatedNode)
            this.lastCreatedNode.next = newNode;

        // If this is our first node, set it as such
        if(!this.beginningNode) this.beginningNode = newNode;

        // Shift the last created node to our new one.
        this.lastCreatedNode = newNode;

        return newNode;
    }

    /**
    * Basically prepare this node for deletion, once this is done, memory management from js will need to take care of this after a `delete` call
    */
    rebindForDelete(targetNode: linkedListNode<Type>)
    {
        if(targetNode.next?.prev)
            targetNode.next.prev = targetNode.prev;

        if(targetNode.prev?.next)
            targetNode.prev.next = targetNode.next;

        // If this is the last linked node in the list, grab it's previous node instead to make that the "lastCreatedNode" (credit - bevelled from twitch)
        if(this.lastCreatedNode === targetNode)
            this.lastCreatedNode = targetNode.prev;

        if(this.beginningNode === targetNode)
            this.beginningNode = targetNode.next;
    }
}

export
{
    linkedListNode,
    nodeInterface
};